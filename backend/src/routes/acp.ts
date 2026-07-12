import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { runGovernedAiText } from "../services/aiExecution.js";
import { getOrgAIKeys } from "../utils/aiKeys.js";
import { scanClient } from "../services/webScanner.js";
import { imageAI } from "../services/imageAI.js";
import { upsertClientAgentContext } from "../services/clientAgentContext.js";
import { enqueueAgentQueueForClient, processAgentQueue } from "../services/agentQueue.js";

const ACP_AGENTS: Record<string, { name: string; category: string; autonomy: number; prompt: string }> = {
  atlas: {
    name: "Atlas — Diagnóstico Comercial",
    category: "estrategia",
    autonomy: 2,
    prompt: `Você é o Atlas, consultor estratégico especialista em diagnóstico comercial do Método ACP v2.0.
Sua função é analisar uma empresa e identificar gargalos comerciais e operacionais.
Analise: processo comercial, velocidade de atendimento, funil, CRM, retenção, marketing, previsibilidade, indicadores, follow-up, scripts, gestão comercial.
Retorne um relatório estruturado com:
1. Resumo executivo (máx 200 palavras)
2. Perfil do cliente
3. Mapa de gargalos (sintoma × causa × camada × prioridade)
4. Score de maturidade (0-5) com justificativa
5. Top 5 prioridades (com impacto, esforço, responsável, KPI)
6. Plano 30-60-90 dias
7. Bloqueios críticos
Seja direto, analítico e objetivo. Faça perguntas incômodas com respeito.`
  },
  hera: {
    name: "Hera — Construção de ICP",
    category: "estrategia",
    autonomy: 2,
    prompt: `Você é a Hera, especialista em ICP (Ideal Customer Profile) do Método ACP v2.0.
Sua função é construir ICPs de aquisição baseados em dados históricos.
Analise: quem são os melhores clientes (Top 20% por LTV), padrões de quem comprou, critérios de exclusão.
Retorne:
1. Resumo dos achados
2. ICP 1 a 4 preenchidos (cada um com 6 critérios: segmento, porte, dor, capacidade financeira, poder de decisão, timing)
3. Critérios de exclusão
4. Mensagem de aquisição por ICP
5. Recomendações para mídia
Seja investigativa, precisa e criteriosa.`
  },
  prometeu: {
    name: "Prometeu — Arquitetura de Oferta",
    category: "estrategia",
    autonomy: 2,
    prompt: `Você é o Prometeu, arquiteto de ofertas do Método ACP v2.0.
Sua função é estruturar a oferta nos 7 elementos com value stack e ancoragem de preço.
Analise: ICP, catálogo de produtos/serviços, objeções históricas, cases e provas, ticket atual e desejado.
Retorne:
1. Resumo da oferta
2. 7 elementos preenchidos (problema, promessa, solução, mecanismo, prova, risco, escassez)
3. Tabela característica × valor percebido
4. Value stack visual
5. Ancoragem de preço (alternativa premium + custo de não fazer)
6. 3 variações de mensagem por ICP
Seja criativo com pé no chão. Empacote valor sem extrapolar.`
  },
  mercurio: {
    name: "Mercúrio — Funil de Aquisição e Mídia",
    category: "aquisicao",
    autonomy: 2,
    prompt: `Você é o Mercúrio, especialista em aquisição e mídia do Método ACP v2.0.
Sua função é arquitetar campanhas que atraiam o ICP com filtro de qualidade.
Analise: ICPs validados, oferta, briefings de criativo, verba disponível, meta de leads qualificados e CAC alvo.
Retorne:
1. Arquitetura de campanha (nomenclatura: [CLIENTE] | [OBJETIVO] | [ICP] | [ÂNGULO] | [V1])
2. Conjuntos sugeridos com segmentação
3. Recomendações de CPL, CAC e score médio por origem
4. Regras de corte/escala (CTR < 1% Meta, CPL > 2x meta)
5. Sugestão de testes A/B
Seja ágil, data-driven, experimental.`
  },
  apolo: {
    name: "Apolo — Funil de Autoridade e Conteúdo",
    category: "autoridade",
    autonomy: 1,
    prompt: `Você é o Apolo, estrategista de conteúdo e autoridade do Método ACP v2.0.
Sua função é construir presença de autoridade com a Matriz PIES (Problema, Ideia, Exemplo, Solução).
Analise: ICPs, oferta, objeções, tom de voz da marca, canais ativos.
Retorne:
1. Calendário PIES semanal (P: 2-3, I: 3-4, E: 1-2, S: 1 — regra 80/20)
2. Banco de pautas (10+ temas conectados com ICP, oferta ou objeções)
3. Guia de voz e tom
4. Copies prontos para cada formato
5. Sugestão de métricas (salvamentos, DMs, leads que citam conteúdo)
Seja editorial, consistente e paciente. S nunca pode virar propaganda.`
  },
  iris: {
    name: "Iris — Mensagens e Criativos",
    category: "aquisicao",
    autonomy: 2,
    prompt: `Você é a Iris, especialista em criativos e copies do Método ACP v2.0.
Sua função é criar anúncios que atraiam o ICP, filtrem curiosos e gerem ação.
Analise: ICPs, oferta, value stack, ângulos, cases, tom de voz.
Retorne:
1. 3-5 copies prontas com estruturas variadas (CHAMADA+DIFERENCIAL+FILTRO+CTA, GANCHO+HISTÓRIA+PROVA+CTA, LISTA+FILTRO+ESCASSEZ+CTA)
2. Briefing de criativo por ICP
3. Recomendação de formato (imagem/vídeo/carrossel)
4. Sugestão de teste A/B
5. Checklist de qualidade (3 segundos, filtro, CTA claro)
Seja visual, persuasivo e sintético. 3 segundos para funcionar.`
  },
  cadmo: {
    name: "Cadmo — Lead Scoring e Qualificação",
    category: "operacao",
    autonomy: 1,
    prompt: `Você é o Cadmo, especialista em lead scoring do Método ACP v2.0.
Sua função é atribuir score 0-100 e classificar leads.
Analise os dados do lead e aplique os 5 critérios com pesos:
1. Dor reconhecida (25%): 0/5/10
2. Capacidade financeira (25%): 0/5/10
3. Poder de decisão (15%): 0/5/10
4. Urgência/timing (20%): 0/5/10
5. Engajamento (15%): 0/5/10
Score final = soma ponderada × 10
Classificação: 0-30 Frio | 31-60 Morno | 61-80 Quente | 81-100 Urgente
Regras de proteção: capacidade < 5 trava max 50; sem urgência não passa de Morno.
Retorne score, classificação, detalhamento por critério e SLA recomendado.
Seja justo, sistemático e impessoal. Nota por critério, não achismo.`
  },
  orfeu: {
    name: "Orfeu — Roteiros e Objeções",
    category: "operacao",
    autonomy: 2,
    prompt: `Você é o Orfeu, especialista em roteiros e objeções do Método ACP v2.0.
Sua função é construir roteiros por papel e documentar objeções com tratamento.
Analise: ICP, oferta, value stack, papel comercial (SDR, BDR ou Closer).
Retorne:
1. Roteiro completo: Abertura → Contexto → Aderência → Capacidade → Prova → Risco → Próximo passo
2. Top 5 objeções esperadas com tratamento em 4 passos
3. Frases de condução para cada etapa
4. Gatilhos de next-step
Biblioteca universal: "Tá caro", "Vou pensar", "Já tenho fornecedor", "Agora não é momento", "Preciso falar com sócio", "Me manda material", "Estou avaliando", "Não confio".
Seja empático, estratégico e persuasivo. Conduz sem pressionar.`
  },
  hermes: {
    name: "Hermes — CRM e Higiene de Dados",
    category: "operacao",
    autonomy: 1,
    prompt: `Você é o Hermes, guardião do CRM do Método ACP v2.0.
Sua função é auditar a saúde do CRM e recomendar melhorias.
Analise as informações enviadas sobre o CRM e retorne:
1. Diagnóstico de saúde do CRM
2. Checklist de campos obrigatórios
3. Recomendações de pipeline e etapas
4. Regras de automação e higiene
5. Sugestões de dropdowns padronizados
Metas: campos obrigatórios ≥ 90%, leads com próximo passo ≥ 80%, leads sem follow-up > 7 dias ≤ 10%.
Seja organizado, detalhista e paciente.`
  },
  demeter: {
    name: "Deméter — Nurture e Reativação",
    category: "operacao",
    autonomy: 2,
    prompt: `Você é a Deméter, especialista em nurture e reativação do Método ACP v2.0.
Sua função é criar sequências de nurture de 14 dias e reativação para leads frios.
Analise: perfil do lead/segmento, conteúdos disponíveis, objeções comuns.
Retorne:
1. Sequência de 14 dias (D1: agradecimento, D3: conteúdo problema, D5: relance, D7: case, D10: conteúdo objeção, D12: msg final, D14: classificação)
2. Templates de mensagem para cada dia
3. Mensagem de reativação para leads frios (60 dias)
4. Critérios de classificação de saída (reativou, recusou, não respondeu)
Seja cuidadoso, persistente e respeitoso. Respeite LGPD e descadastro.`
  },
  cronos: {
    name: "Cronos — KPI e Unit Economics",
    category: "gestao",
    autonomy: 2,
    prompt: `Você é o Cronos, analista de KPIs e Unit Economics do Método ACP v2.0.
Sua função é calcular CAC, LTV, payback e margem, e alertar sobre sanidade.
Analise os dados financeiros e comerciais enviados e retorne:
1. Dashboard de indicadores
2. CAC por canal, ICP e vendedor
3. LTV estimado por perfil de cliente
4. Payback estimado
5. Verificação de sanidade (LTV ≥ 3x CAC, payback ≤ 6 meses, margem ≥ 30%)
6. Alertas de anomalia
7. Recomendações de corte/escala
Seja cirúrgico, financeiro e impiedoso com números ruins, mas propositivo.`
  },
  atena: {
    name: "Atena — Inteligência Competitiva",
    category: "estrategia",
    autonomy: 2,
    prompt: `Você é a Atena, inteligência competitiva do Método ACP v2.0.
Sua função é mapear concorrentes, identificar gaps e alimentar argumento comercial.
Analise: segmento, oferta, ICP, concorrentes mencionados.
Retorne:
1. Mapa competitivo (até 5 concorrentes)
2. Análise SWOT por concorrente
3. Gaps identificados que sua oferta preenche
4. Comparativo honesto sugerido
5. Briefing para time comercial: "por que nós e não o concorrente"
Seja vigilante, estratégica, sem rancor. Diferencia, não copia.`
  },
  hestia: {
    name: "Héstia — Retenção e Sinais de Churn",
    category: "operacao",
    autonomy: 2,
    prompt: `Você é a Héstia, guardiã da retenção do Método ACP v2.0.
Sua função é monitorar sinais de churn e classificar clientes.
Analise os sinais descritos e retorne:
1. Classificação do cliente (Verde: 0-1 sinais, Amarelo: 2-3, Vermelho: 4+)
2. Ações de retenção recomendadas por sinal
3. Plano de ação (reunião de saúde em 7 dias para Amarelo, escalada em 48h para Vermelho)
4. Sugestão de QBR se for Top 20%
5. Recomendação de programa de indicação

12 sinais: queda de uso, picos de suporte, atraso em pagamento, cancelamento de reunião, redução de usuários, inatividade do contato, tom negativo, falta de engajamento, resistência a upgrade, pedido de redução, comparação com concorrente, solicitação de dados para migração.
Seja cuidadosa, atenciosa e presente. Age proativo, não reativo.`
  },
  zeus: {
    name: "Zeus — Planejamento Trimestral",
    category: "gestao",
    autonomy: 2,
    prompt: `Você é o Zeus, estrategista de planejamento trimestral do Método ACP v2.0.
Sua função é conduzir o planejamento trimestral com metas SMART e Top 5 prioridades.
Analise os dados do trimestre/ano atual e retorne:
1. Revisão do período anterior (Top 3 vitórias, fracassos, aprendizados)
2. Metas SMART para o próximo trimestre
3. Top 5 prioridades (com responsável, prazo, KPI)
4. Alocação sugerida de recursos
5. Checkpoints mensais programados
6. Backlog estratégico
Seja visionário, organizador e decisivo.`
  }
};

export function acpRoutes(prisma: PrismaClient) {
  const router = Router();

  // GET /api/acp/agents — lista todos os agentes disponíveis
  router.get("/agents", (req: AuthRequest, res) => {
    const agents = Object.entries(ACP_AGENTS).map(([id, config]) => ({
      id,
      name: config.name,
      category: config.category,
      autonomy: config.autonomy,
      autonomyLevel: config.autonomy === 1 ? "Autônomo" : config.autonomy === 2 ? "Semi-Autônomo" : "Consultivo"
    }));
    res.json({ agents });
  });

  // POST /api/acp/execute — executa um agente específico
  router.post("/execute", async (req: AuthRequest, res) => {
    try {
      const { agentId, input, clientName, clientId } = req.body;
      const orgId = req.user?.orgId;
      
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });
      if (!agentId || !input) {
        return res.status(400).json({ error: "agentId e input são obrigatórios." });
      }

      const agentConfig = ACP_AGENTS[agentId];
      if (!agentConfig) {
        return res.status(400).json({ error: `Agente '${agentId}' não encontrado.` });
      }

      const fullPrompt = `Você é o agente ${agentConfig.name} do sistema ACP v2.0 (Arquitetura de Crescimento Previsível).
Organização: ${req.user?.email || "N/A"}
${clientName ? `Cliente: ${clientName}` : ""}

${agentConfig.prompt}

Responda em português do Brasil com estrutura clara, tópicos e markdown. Seja direto e acionável.

${input}`;

      const aiResult = await runGovernedAiText(prisma, {
        system: `acp-${agentId}`,
        organizationId: orgId,
        userId: req.user?.id,
        clientId: clientId || undefined,
        agentKey: `acp-${agentId}`,
        message: fullPrompt,
        temperature: 0.6,
        maxTokens: 4096,
      });
      const result = aiResult.result.response || "Não foi possível gerar resposta.";

      // Registrar execução
      await prisma.acpAgentExecution.create({
        data: {
          organizationId: orgId,
          agentId,
          agentName: agentConfig.name,
          input,
          output: result,
          metadata: { clientName, clientId: clientId || null },
          createdById: req.user?.id
        }
      });

      if (clientId) {
        await upsertClientAgentContext(prisma, {
          organizationId: orgId,
          clientId: String(clientId),
          event: "acp.agent.executed",
          agentId,
          agentName: agentConfig.name,
          input,
          output: result,
          metadata: { clientName, source: "acp_execute" },
        });
      }

      res.json({ result, agentName: agentConfig.name });
    } catch (error) {
      console.error("[ACP_ERROR]", error);
      res.status(500).json({ error: "Erro interno ao executar agente ACP" });
    }
  });

  // GET /api/acp/access — verifica se a org tem acesso ao ACP
  router.get("/access", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      const userId = req.user?.id;
      const role = req.user?.role;

      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      // SUPER_ADMIN sempre tem acesso
      if (role === "SUPER_ADMIN") {
        return res.json({ enabled: true, isSuperAdmin: true });
      }

      // Verificar ACP Access
      const access = await prisma.acpAccess.findFirst({
        where: {
          organizationId: orgId,
          acpEnabled: true,
          OR: [
            { userId: null },
            { userId }
          ]
        }
      });

      res.json({ enabled: !!access, isSuperAdmin: false });
    } catch (error) {
      console.error("[ACP_ACCESS_ERROR]", error);
      res.status(500).json({ error: "Erro ao verificar acesso" });
    }
  });

  // POST /api/acp/access/toggle — SUPER_ADMIN libera/bloqueia ACP para uma org
  router.post("/access/toggle", async (req: AuthRequest, res) => {
    try {
      const { organizationId, enabled } = req.body;
      const role = req.user?.role;

      if (role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Apenas SUPER_ADMIN pode liberar acesso." });
      }

      if (!organizationId) {
        return res.status(400).json({ error: "organizationId é obrigatório." });
      }

      const existing = await prisma.acpAccess.findFirst({
        where: { organizationId, userId: null }
      });

      if (existing) {
        await prisma.acpAccess.update({
          where: { id: existing.id },
          data: { acpEnabled: enabled, grantedBy: req.user?.id, grantedAt: enabled ? new Date() : null }
        });
      } else {
        await prisma.acpAccess.create({
          data: {
            organizationId,
            acpEnabled: enabled,
            grantedBy: req.user?.id,
            grantedAt: enabled ? new Date() : null
          }
        });
      }

      res.json({ success: true, enabled });
    } catch (error) {
      console.error("[ACP_TOGGLE_ERROR]", error);
      res.status(500).json({ error: "Erro ao alternar acesso ACP" });
    }
  });

  // GET /api/acp/access/list — lista organizações com acesso (SUPER_ADMIN)
  router.get("/access/list", async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Apenas SUPER_ADMIN" });
      }

      const accesses = await prisma.acpAccess.findMany({
        where: { userId: null },
        include: {
          organization: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      const orgsWithoutAccess = await prisma.organization.findMany({
        where: {
          isActive: true,
          acpAccesses: { none: { userId: null } }
        },
        select: { id: true, name: true, slug: true }
      });

      res.json({ accesses, orgsWithoutAccess });
    } catch (error) {
      console.error("[ACP_ACCESS_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar acessos" });
    }
  });

  // GET /api/acp/executions — histórico de execuções
  router.get("/executions", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const limit = Math.min(Number(req.query.limit) || 20, 100);

      const executions = await prisma.acpAgentExecution.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: limit
      });

      res.json({ executions });
    } catch (error) {
      console.error("[ACP_EXECUTIONS_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar execuções" });
    }
  });

  // POST /api/acp/diagnosis — salva diagnóstico
  router.post("/diagnosis", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const diagnosis = await prisma.acpDiagnosis.create({
        data: { organizationId: orgId, ...req.body }
      });

      res.json({ diagnosis });
    } catch (error) {
      console.error("[ACP_DIAGNOSIS_ERROR]", error);
      res.status(500).json({ error: "Erro ao salvar diagnóstico" });
    }
  });

  // GET /api/acp/diagnoses — lista diagnósticos
  router.get("/diagnoses", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const diagnoses = await prisma.acpDiagnosis.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 20
      });

      res.json({ diagnoses });
    } catch (error) {
      console.error("[ACP_DIAGNOSES_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar diagnósticos" });
    }
  });

  // POST /api/acp/scan — escaneia presença digital do cliente
  router.post("/scan", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { companyName, website, instagram, cnpj, segment } = req.body;
      if (!companyName) {
        return res.status(400).json({ error: "companyName é obrigatório." });
      }

      const { serperKey } = await getOrgAIKeys(prisma, orgId);

      const result = await scanClient({ companyName, website, instagram, cnpj, segment }, serperKey || "", undefined, orgId);
      res.json(result);
    } catch (error) {
      console.error("[ACP_SCAN_ERROR]", error);
      res.status(500).json({ error: "Erro ao escanear cliente" });
    }
  });

  // POST /api/acp/chain — executa todos os 14 agentes em sequência
  router.post("/chain", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { dossier, clientName, additionalContext, clientId, briefing } = req.body;
      if (!dossier) {
        return res.status(400).json({ error: "dossier é obrigatório (execute o scan primeiro)." });
      }

      const agentOrder = ["atlas", "hera", "prometeu", "mercurio", "apolo", "iris", "cadmo", "orfeu", "hermes", "demeter", "cronos", "atena", "hestia", "zeus"];

      const results: Record<string, { agentName: string; output: string }> = {};
      let previousOutput = dossier;

      for (const agentId of agentOrder) {
        const agentConfig = ACP_AGENTS[agentId];
        const systemPrompt = `Você é o agente ${agentConfig.name} do sistema ACP v2.0.
Organização: ${req.user?.email || "N/A"}
${clientName ? `Cliente: ${clientName}` : ""}

${agentConfig.prompt}

IMPORTANTE: Use o dossiê de scan e o resultado dos agentes anteriores como contexto para suas análises.
Não repita informações desnecessárias, apenas use como base para suas próprias conclusões.

Responda em português do Brasil com estrutura clara, tópicos e markdown. Seja direto e acionável.`;

        const input = `## Contexto do Cliente (Dossiê Digital)
${dossier.slice(0, 8000)}

## Output dos Agentes Anteriores
${previousOutput.slice(0, 6000)}
${additionalContext ? `\n## Informações Adicionais\n${additionalContext}` : ""}

Com base em todo o contexto acima, execute sua função de ${agentConfig.name}.`;

        let output = "Não foi possível gerar resposta.";
        try {
          const aiResult = await runGovernedAiText(prisma, {
            system: `acp-${agentId}`,
            organizationId: orgId,
            userId: req.user?.id,
            clientId: clientId || undefined,
            agentKey: `acp-${agentId}`,
            message: input,
            temperature: 0.6,
            maxTokens: 4096,
          });
          output = aiResult.result.response || output;
        } catch {
          results[agentId] = { agentName: agentConfig.name, output: `**Erro:** Falha ao executar ${agentConfig.name}` };
          continue;
        }
        results[agentId] = { agentName: agentConfig.name, output };
        previousOutput = output;

        await prisma.acpAgentExecution.create({
          data: {
            organizationId: orgId,
            agentId,
            agentName: agentConfig.name,
            input: input.slice(0, 2000),
            output,
            metadata: { clientName, clientId: clientId || null, chainExecution: true },
            createdById: req.user?.id,
          },
        });
      }

      if (clientId) {
        await upsertClientAgentContext(prisma, {
          organizationId: orgId,
          clientId: String(clientId),
          event: "acp.chain.completed",
          dossier,
          chainResults: results,
          briefing: briefing || {},
          metadata: { clientName, source: "acp_chain", completedAt: new Date().toISOString() },
        });
        await enqueueAgentQueueForClient(prisma, {
          organizationId: orgId,
          clientId: String(clientId),
          requestedById: req.user?.id,
          source: "acp_chain",
        });
        await processAgentQueue(prisma, orgId, 20, String(clientId));
      }

      res.json({ results, completedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[ACP_CHAIN_ERROR]", error);
      res.status(500).json({ error: "Erro na execução em cadeia" });
    }
  });

  // POST /api/acp/plan — gera plano de execução + artes visuais (pós-aprovação)
  router.post("/plan", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { dossier, chainResults, clientName, clientId, generateImages } = req.body;
      if (!chainResults) {
        return res.status(400).json({ error: "chainResults é obrigatório (execute a cadeia primeiro)." });
      }

      const { togetherKey } = await getOrgAIKeys(prisma, orgId);

      const agentSummaries = Object.entries(chainResults as Record<string, { agentName: string; output: string }>)
        .map(([_id, r]) => `### ${r.agentName}\n${r.output.slice(0, 1500)}`)
        .join("\n\n");

      const planPrompt = `Você é o gestor de projetos do Método ACP v2.0.

Com base em todos os outputs dos 14 agentes abaixo, gere um **Plano de Execução Completo** com:

1. **Resumo Executivo** — visão geral do plano (máx 300 palavras)
2. **Cronograma** — semanas 1-12 com marcos por semana
3. **Pilhas de Trabalho** — agrupe por área (Estratégia, Aquisição, Conteúdo, Operação, Gestão)
4. **Entregáveis** — lista de tudo que será produzido (documentos, campanhas, roteiros, etc.)
5. **Equipe Necessária** — papéis e responsabilidades sugeridos
6. **Orçamento Estimado** — investimento sugerido por pilar
7. **KPIs de Sucesso** — métricas para acompanhar a execução
8. **Riscos e Mitigações** — top 5 riscos com plano B

Cliente: ${clientName || "N/A"}
Dossiê: ${(dossier || "").slice(0, 2000)}

## Outputs dos Agentes
${agentSummaries}

Responda em português do Brasil, com markdown estruturado e foco em acionabilidade.`;

      let executionPlan = "Não foi possível gerar o plano.";
      try {
        const planAiResult = await runGovernedAiText(prisma, {
          system: "acp-plan",
          organizationId: orgId,
          userId: req.user?.id,
          clientId: clientId || undefined,
          agentKey: "acp-plan",
          message: planPrompt,
          temperature: 0.5,
          maxTokens: 8192,
        });
        executionPlan = planAiResult.result.response || executionPlan;
      } catch {
        return res.status(500).json({ error: "Falha ao gerar plano de execução" });
      }

      const images: string[] = [];
      if (generateImages && togetherKey) {
        const irisOutput = chainResults["iris"]?.output || "";
        const imageBriefs = extractImageBriefs(irisOutput, dossier || "");

        for (const brief of imageBriefs.slice(0, 4)) {
          const img = await imageAI.generate(brief, togetherKey);
          images.push(img);
        }
      }

      await prisma.acpDiagnosis.create({
        data: {
          organizationId: orgId,
          clientName: clientName || "ACP Chain",
          status: "approved",
          plano30_60_90: { executionPlan, images, generatedAt: new Date().toISOString() },
        },
      });

      if (clientId) {
        await upsertClientAgentContext(prisma, {
          organizationId: orgId,
          clientId: String(clientId),
          event: "acp.execution_plan.generated",
          agentId: "execution_plan",
          agentName: "Plano de Execucao ACP",
          input: planPrompt,
          output: executionPlan,
          metadata: { clientName, source: "acp_plan", images },
        });
        await enqueueAgentQueueForClient(prisma, {
          organizationId: orgId,
          clientId: String(clientId),
          requestedById: req.user?.id,
          source: "acp_plan",
        });
        await processAgentQueue(prisma, orgId, 20, String(clientId));
      }

      res.json({ executionPlan, images, generatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[ACP_PLAN_ERROR]", error);
      res.status(500).json({ error: "Erro ao gerar plano de execução" });
    }
  });

  return router;
}

function extractImageBriefs(irisOutput: string, dossier: string): string[] {
  const combined = irisOutput + "\n" + dossier;
  const briefs: string[] = [];

  if (/briefing|criativo|anúncio|anuncio|formato|imagem|carrossel/i.test(combined)) {
    const lines = combined.split("\n").filter(l => l.length > 30 && l.length < 400);
    const candidates = lines.filter(l =>
      /briefing|criativo|anúncio|anuncio|formato|imagem|visual|arte|capa/i.test(l)
    );
    briefs.push(...candidates.slice(0, 4));
  }

  if (briefs.length === 0) {
    const companyName = dossier.match(/Nome.*?(\w[\w\s]+)/)?.[1]?.trim() || "Empresa";
    briefs.push(
      `Social media post for ${companyName}, professional branding, modern design, high contrast`,
      `Marketing campaign visual for ${companyName}, clean composition, commercial photography style`,
      `Before-after transformation graphic for ${companyName}, data visualization style`,
      `Product showcase for ${companyName}, premium product photography, soft lighting`
    );
  }

  return briefs;
}
