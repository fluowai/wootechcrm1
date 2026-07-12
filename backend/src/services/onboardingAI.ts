import { PrismaClient } from "@prisma/client";
import { runGovernedAiText } from "./aiExecution.js";

interface OnboardingAnswers {
  businessName: string;
  businessType: string;
  targetAudience: string;
  averageTicket: number | null;
  salesCycle: string | null;
  needsMeeting: boolean;
  needsProposal: boolean;
  needsContract: boolean;
  hasRecurrence: boolean;
  leadChannels: string[];
  hasSdr: boolean;
  hasCloser: boolean;
  hasPostSales: boolean;
  painPoints: string | null;
  biggestProblem: string | null;
  deliveryProcess: string | null;
  hasOnboarding: boolean;
  hasChecklist: boolean;
  hasRenewal: boolean;
  hasUpsell: boolean;
}

interface AiDiagnosis {
  recommendedTemplate: string;
  templateLabel: string;
  pipelineName: string;
  stages: { name: string; order: number; probability: number; isDefault: boolean; color?: string }[];
  customFields: { name: string; key: string; type: string; options?: string[]; model: string }[];
  tasks: { title: string; description?: string; daysAfterStage?: number; stageName?: string }[];
  scripts: { name: string; text: string; stage?: string }[];
  playbook: { title: string; content: string }[];
  summary: string;
}

export class OnboardingAIService {
  constructor(private prisma: PrismaClient) {}

  private buildPrompt(answers: OnboardingAnswers): string {
    return `Você é um Arquiteto Comercial Sênior especializado em configurar CRMs para diferentes modelos de negócio.

Baseado nas respostas abaixo sobre a empresa, gere uma configuração completa de ambiente comercial.

## Dados da Empresa
- Nome: ${answers.businessName}
- Tipo de negócio: ${answers.businessType}
- Público-alvo: ${answers.targetAudience}
- Ticket médio: ${answers.averageTicket ? `R$ ${answers.averageTicket}` : "Não informado"}
- Ciclo de venda: ${answers.salesCycle || "Não informado"}
- Precisa de reunião: ${answers.needsMeeting ? "Sim" : "Não"}
- Precisa de proposta: ${answers.needsProposal ? "Sim" : "Não"}
- Precisa de contrato: ${answers.needsContract ? "Sim" : "Não"}
- Tem recorrência: ${answers.hasRecurrence ? "Sim" : "Não"}
- Canais de captação: ${answers.leadChannels.join(", ")}
- Tem SDR: ${answers.hasSdr ? "Sim" : "Não"}
- Tem Closer: ${answers.hasCloser ? "Sim" : "Não"}
- Tem pós-venda: ${answers.hasPostSales ? "Sim" : "Não"}
- Dores/Pontos críticos: ${answers.painPoints || "Não informado"}
- Maior problema comercial: ${answers.biggestProblem || "Não informado"}
- Processo de entrega: ${answers.deliveryProcess || "Não informado"}
- Tem onboarding: ${answers.hasOnboarding ? "Sim" : "Não"}
- Tem checklist: ${answers.hasChecklist ? "Sim" : "Não"}
- Tem renovação: ${answers.hasRenewal ? "Sim" : "Não"}
- Tem upsell: ${answers.hasUpsell ? "Sim" : "Não"}

## Instruções

Com base nessas informações, determine qual template de operação comercial se encaixa melhor:

1. "venda-consultiva" — Para consultorias, assessorias, serviços premium, alto ticket. Funil: Lead Recebido > Qualificação > Diagnóstico > Proposta Enviada > Negociação > Fechado > Onboarding
2. "agencia-marketing" — Para agências de marketing, mídia, social media. Funil: Lead Recebido > Auditoria > Call Estratégica > Proposta > Fechamento > Onboarding > Retenção
3. "treinamento-educacao" — Para empresas de treinamento, cursos, escolas. Funil: Interessado > Qualificação > Inscrição > Pagamento > Turma > Pós-treinamento
4. "servicos-locais" — Para serviços locais, clínicas, escritórios. Funil: Solicitação > Orçamento > Agendamento > Execução > Pagamento > Avaliação
5. "b2b-comercial" — Para B2B, SaaS, tecnologia, fornecedores. Funil: Prospecção > Conexão > Qualificação > Reunião > Proposta > Follow-up > Contrato > Implantação

Retorne APENAS um JSON válido (sem markdown, sem comentários) com esta estrutura exata:
{
  "recommendedTemplate": "slug-do-template",
  "templateLabel": "Nome do Template",
  "pipelineName": "Nome do Funil",
  "summary": "Resumo de 2-3 linhas explicando a escolha",
  "stages": [
    { "name": "Nome da Etapa", "order": 0, "probability": 10, "isDefault": false, "color": "#3B82F6" }
  ],
  "customFields": [
    { "name": "Nome do Campo", "key": "nome_do_campo", "type": "TEXT", "model": "OPPORTUNITY" }
  ],
  "tasks": [
    { "title": "Título da Tarefa", "description": "Descrição", "daysAfterStage": 2, "stageName": "Nome da Etapa" }
  ],
  "scripts": [
    { "name": "Nome do Script", "text": "Texto do script com {placeholders}", "stage": "Nome da Etapa" }
  ],
  "playbook": [
    { "title": "Título do tópico", "content": "Conteúdo explicativo" }
  ]
}`;
  }

  async generateDiagnosis(answers: OnboardingAnswers, orgId: string, userId?: string): Promise<AiDiagnosis> {
    const prompt = this.buildPrompt(answers);
    const startTime = Date.now();

    try {
      const result = await runGovernedAiText(this.prisma, {
        message: prompt,
        model: process.env.AI_CORE_ONBOARDING_MODEL ||
          process.env.GROQ_MODEL ||
          (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini"),
        temperature: 0.3,
        maxTokens: 4096,
        organizationId: orgId,
        userId,
        agentKey: "onboarding-diagnosis",
      });

      const content = result.result.response;
      const diagnosis = JSON.parse(content) as AiDiagnosis;
      const durationMs = Date.now() - startTime;

      await this.prisma.aiLog.create({
        data: {
          organizationId: orgId,
          userId: userId,
          agentType: "diagnosis",
          prompt,
          response: content,
          model: result.result.usage.model,
          tokensIn: result.result.usage.tokensIn,
          tokensOut: result.result.usage.tokensOut,
          durationMs,
          success: true,
        },
      });

      return diagnosis;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.prisma.aiLog.create({
        data: {
          organizationId: orgId,
          userId: userId,
          agentType: "diagnosis",
          prompt,
          response: error.message,
          model: "ai-core",
          durationMs,
          success: false,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  async applyDiagnosis(orgId: string, diagnosis: AiDiagnosis, userId?: string): Promise<void> {
    if (!diagnosis?.pipelineName || !Array.isArray(diagnosis.stages) || diagnosis.stages.length === 0) {
      throw new Error("Diagnostico invalido: pipelineName e stages sao obrigatorios.");
    }
    diagnosis.customFields = Array.isArray(diagnosis.customFields) ? diagnosis.customFields : [];
    diagnosis.tasks = Array.isArray(diagnosis.tasks) ? diagnosis.tasks : [];
    diagnosis.scripts = Array.isArray(diagnosis.scripts) ? diagnosis.scripts : [];
    diagnosis.playbook = Array.isArray(diagnosis.playbook) ? diagnosis.playbook : [];

    let pipeline = await this.prisma.pipeline.findFirst({
      where: { organizationId: orgId, name: diagnosis.pipelineName, type: "SALES" },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    if (!pipeline) {
      pipeline = await this.prisma.pipeline.create({
        data: {
          name: diagnosis.pipelineName,
          organizationId: orgId,
          type: "SALES",
          stages: {
            create: diagnosis.stages.map((s) => ({
              name: s.name,
              order: s.order,
              probability: s.probability,
              isDefault: s.isDefault,
              color: s.color || "#3B82F6",
            })),
          },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    } else {
      const existingStageNames = new Set(pipeline.stages.map((stage) => stage.name.toLowerCase()));
      for (const stage of diagnosis.stages) {
        if (!existingStageNames.has(stage.name.toLowerCase())) {
          await this.prisma.pipelineStage.create({
            data: {
              pipelineId: pipeline.id,
              name: stage.name,
              order: stage.order,
              probability: stage.probability,
              isDefault: stage.isDefault,
              color: stage.color || "#3B82F6",
            },
          });
        }
      }
      pipeline = await this.prisma.pipeline.findUnique({
        where: { id: pipeline.id },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }

    if (!pipeline) throw new Error("Nao foi possivel criar ou localizar o pipeline recomendado.");

    const defaultDiagnosisStage = diagnosis.stages.find((s) => s.isDefault) || diagnosis.stages[0];
    const defaultStage =
      pipeline.stages.find((stage) => stage.name === defaultDiagnosisStage?.name) ||
      pipeline.stages.find((stage) => stage.isDefault) ||
      pipeline.stages[0];

    // 1. Criar tarefas padrão
    for (const task of diagnosis.tasks) {
      const existingTask = await this.prisma.task.findFirst({
        where: { organizationId: orgId, title: task.title, assignedToId: userId || null },
      });
      if (existingTask) continue;

      await this.prisma.task.create({
        data: {
          title: task.title,
          description: task.description || null,
          status: "pendente",
          priority: "media",
          organizationId: orgId,
          assignedToId: userId || null,
        },
      });
    }

    // 2. Criar campos personalizados
    for (const field of diagnosis.customFields) {
      const key = field.key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      await this.prisma.customField.upsert({
        where: {
          organizationId_key_model: {
            organizationId: orgId,
            key,
            model: field.model,
          },
        },
        update: {
          name: field.name,
          type: field.type,
          options: field.options || undefined,
          isActive: true,
        },
        create: {
          organizationId: orgId,
          name: field.name,
          key,
          type: field.type,
          options: field.options || undefined,
          model: field.model,
        },
      });
    }

    await this.prisma.onboardingGeneratedItem.deleteMany({
      where: { organizationId: orgId, type: { in: ["SCRIPT", "PLAYBOOK"] } },
    });

    // 3. Salvar scripts de atendimento gerados pela IA
    if (diagnosis.scripts && Array.isArray(diagnosis.scripts)) {
      for (const script of diagnosis.scripts) {
        await this.prisma.onboardingGeneratedItem.create({
          data: {
            organizationId: orgId,
            type: "SCRIPT",
            name: script.name,
            content: script.text,
            stage: script.stage || null,
            userId: userId || null,
            isActive: true,
          },
        });
      }
    }

    // 4. Salvar playbook comercial gerado pela IA
    if (diagnosis.playbook && Array.isArray(diagnosis.playbook)) {
      for (const item of diagnosis.playbook) {
        await this.prisma.onboardingGeneratedItem.create({
          data: {
            organizationId: orgId,
            type: "PLAYBOOK",
            name: item.title,
            content: item.content,
            userId: userId || null,
            isActive: true,
          },
        });
      }
    }

    // 5. Criar automações iniciais baseadas nas configurações
    const baseAutomations = [
      {
        name: "Lead → Oportunidade automática",
        description: "Quando um lead for criado com status 'novo', criar automaticamente uma oportunidade no pipeline",
        triggerType: "lead.created",
        triggerConfig: { conditions: { status: "novo" } },
        actions: [
          { type: "create_opportunity", params: { pipelineId: pipeline.id, stageId: defaultStage?.id } },
          { type: "notify", params: { title: "Novo lead capturado", message: "Um novo lead foi criado e uma oportunidade foi gerada" } },
        ],
      },
      {
        name: "Follow-up de proposta",
        description: "Quando uma proposta for enviada, criar follow-up automático para 3 dias depois",
        triggerType: "proposal.sent",
        triggerConfig: {},
        actions: [
          { type: "create_followup", params: { daysAfter: 3, content: "Verificar se o cliente recebeu e analisou a proposta" } },
        ],
      },
      {
        name: "Onboarding pós-venda",
        description: "Quando uma oportunidade for ganha, criar tarefas de onboarding",
        triggerType: "opportunity.won",
        triggerConfig: {},
        actions: [
          { type: "create_task", params: { title: "Iniciar onboarding do cliente", description: "Passar lead para equipe de operação", priority: "alta" } },
          { type: "create_task", params: { title: "Agendar kickoff", description: "Agendar reunião inicial com o cliente", priority: "alta" } },
          { type: "notify", params: { title: "Nova venda fechada!", message: "Uma oportunidade foi convertida em cliente" } },
        ],
      },
    ];

    for (const automation of baseAutomations) {
      const existingAutomation = await this.prisma.automation.findFirst({
        where: { organizationId: orgId, name: automation.name, triggerType: automation.triggerType },
      });
      if (existingAutomation) continue;

      await this.prisma.automation.create({
        data: {
          name: automation.name,
          description: automation.description,
          triggerType: automation.triggerType,
          triggerConfig: automation.triggerConfig as any,
          actions: automation.actions as any,
          organizationId: orgId,
          isActive: true,
        },
      });
    }
  }

}
