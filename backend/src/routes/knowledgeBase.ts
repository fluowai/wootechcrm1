import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

const ACP_METHOD_ARTICLES = [
  {
    title: "Atlas — Diagnóstico Comercial (Fase 1)",
    category: "IA ACP",
    tags: ["ACP", "Fase 1", "Diagnóstico", "Atlas"],
    content: `# Atlas — Diagnóstico Comercial

## Objetivo
Conduzir diagnóstico inicial, mapear gargalos e gerar plano 30-60-90.

## O que analisar
- Processo comercial
- Velocidade de atendimento
- Funil de vendas
- CRM e higiene de dados
- Retenção de clientes
- Marketing e aquisição
- Previsibilidade de receita
- Indicadores e métricas
- Follow-up e nutrição
- Scripts e abordagem
- Gestão comercial

## Output esperado
1. Resumo executivo (máx 200 palavras)
2. Perfil do cliente
3. Mapa de gargalos (sintoma × causa × camada × prioridade)
4. Score de maturidade (0-5) com justificativa
5. Top 5 prioridades (com impacto, esforço, responsável, KPI)
6. Plano 30-60-90 dias
7. Bloqueios críticos

## Quando usar
No início do engagement com um novo cliente, antes de qualquer ação estratégica.`
  },
  {
    title: "Hera — Construção de ICP (Fase 2)",
    category: "IA ACP",
    tags: ["ACP", "Fase 2", "ICP", "Hera"],
    content: `# Hera — Construção de ICP

## Objetivo
Construir ICP com 6 critérios baseado em dados reais da base histórica.

## O que analisar
- Quem são os melhores clientes (Top 20% por LTV)
- Padrões de quem comprou vs. quem não comprou
- Critérios de exclusão
- Canais de aquisição mais eficientes

## Output esperado
1. Resumo dos achados
2. ICP 1 a 4 preenchidos (cada um com 6 critérios: segmento, porte, dor, capacidade financeira, poder de decisão, timing)
3. Critérios de exclusão
4. Mensagem de aquisição por ICP
5. Recomendações para mídia

## Quando usar
Após o diagnóstico (Atlas), para definir exatamente quem prospectar.`
  },
  {
    title: "Prometeu — Arquitetura de Oferta (Fase 3)",
    category: "IA ACP",
    tags: ["ACP", "Fase 3", "Oferta", "Prometeu"],
    content: `# Prometeu — Arquitetura de Oferta

## Objetivo
Estruturar a oferta com value stack e ancoragem de preço.

## O que analisar
- ICPs validados
- Catálogo de produtos/serviços
- Ticket atual e desejado
- Cases e provas sociais
- Objeções comuns
- Concorrentes

## Output esperado
1. Resumo da oferta
2. 7 elementos preenchidos (problema, promessa, solução, mecanismo, prova, risco, escassez)
3. Tabela característica × valor percebido
4. Value stack visual
5. Ancoragem de preço (alternativa premium + custo de não fazer)
6. 3 variações de mensagem por ICP

## Quando usar
Após definir os ICPs, para criar uma oferta irresistível para cada perfil.`
  },
  {
    title: "Mercúrio — Funil de Aquisição e Mídia (Fase 4)",
    category: "IA ACP",
    tags: ["ACP", "Fase 4", "Aquisição", "Mídia", "Mercúrio"],
    content: `# Mercúrio — Funil de Aquisição e Mídia

## Objetivo
Arquitetar campanhas que atraiam o ICP com filtro de qualidade.

## O que analisar
- ICPs validados
- Oferta estruturada
- Briefings de criativo
- Verba disponível
- Meta de leads qualificados
- CAC alvo

## Output esperado
1. Arquitetura de campanha com nomenclatura padrão
2. Conjuntos sugeridos com segmentação
3. Recomendações de CPL, CAC e score médio por origem
4. Regras de corte/escala (CTR < 1% Meta, CPL > 2x meta)
5. Sugestão de testes A/B

## Quando usar
Após a oferta estar definida, para estruturar a captação de leads pagos.`
  },
  {
    title: "Apolo — Funil de Autoridade e Conteúdo (Fase 5)",
    category: "IA ACP",
    tags: ["ACP", "Fase 5", "Conteúdo", "Autoridade", "Apolo"],
    content: `# Apolo — Funil de Autoridade e Conteúdo

## Objetivo
Construir presença de autoridade com a Matriz PIES.

## Matriz PIES
- **P**roblema: Conteúdo que valida a dor do ICP
- **I**deia: Conceito novo que diferencia a abordagem
- **E**xemplo: Case real que demonstra resultado
- **S**olução: Abertura para conversa comercial (mínimo)

Regra 80/20: 80% conteúdo de valor, 20% solução.

## Output esperado
1. Calendário PIES semanal
2. Banco de pautas (10+ temas conectados com ICP, oferta ou objeções)
3. Guia de voz e tom
4. Copies prontos para cada formato
5. Sugestão de métricas (salvamentos, DMs, leads que citam conteúdo)

## Quando usar
Paralelamente à aquisição paga, para construir autoridade orgânica.`
  },
  {
    title: "Iris — Mensagens e Criativos (Fase 6)",
    category: "IA ACP",
    tags: ["ACP", "Fase 6", "Criativos", "Copies", "Iris"],
    content: `# Iris — Mensagens e Criativos

## Objetivo
Criar anúncios que atraiam o ICP, filtrem curiosos e gerem ação.

## Estruturas de copy
1. CHAMADA + DIFERENCIAL + FILTRO + CTA
2. GANCHO + HISTÓRIA + PROVA + CTA
3. LISTA + FILTRO + ESCASSEZ + CTA

## Output esperado
1. 3-5 copies prontas com estruturas variadas
2. Briefing de criativo por ICP
3. Recomendação de formato (imagem/vídeo/carrossel)
4. Sugestão de teste A/B
5. Checklist de qualidade (3 segundos, filtro, CTA claro)

## Quando usar
Após a arquitetura de aquisição, para criar os materiais das campanhas.`
  },
  {
    title: "Cadmo — Lead Scoring e Qualificação (Fase 7)",
    category: "IA ACP",
    tags: ["ACP", "Fase 7", "Lead Scoring", "Cadmo"],
    content: `# Cadmo — Lead Scoring e Qualificação

## Objetivo
Atribuir score 0-100 e classificar leads em Frio/Morno/Quente/Urgente.

## Critérios com pesos
1. Dor reconhecida (25%): 0/5/10
2. Capacidade financeira (25%): 0/5/10
3. Poder de decisão (15%): 0/5/10
4. Urgência/timing (20%): 0/5/10
5. Engajamento (15%): 0/5/10

Score final = soma ponderada × 10

## Classificação
- 0-30: Frio
- 31-60: Morno
- 61-80: Quente
- 81-100: Urgente

## Regras de proteção
- Capacidade < 5 trava max 50
- Sem urgência não passa de Morno

## Quando usar
Automaticamente para todo lead que entra no CRM, antes de ser distribuído para o time.`
  },
  {
    title: "Orfeu — Roteiros e Objeções (Fase 8)",
    category: "IA ACP",
    tags: ["ACP", "Fase 8", "Roteiros", "Objeções", "Orfeu"],
    content: `# Orfeu — Roteiros e Objeções

## Objetivo
Criar roteiros por papel e documentar objeções com tratamento.

## Estrutura do roteiro
1. Abertura
2. Contexto
3. Aderência
4. Capacidade
5. Prova
6. Risco
7. Próximo passo

## Biblioteca universal de objeções
- "Tá caro"
- "Vou pensar"
- "Já tenho fornecedor"
- "Agora não é momento"
- "Preciso falar com sócio"
- "Me manda material"
- "Estou avaliando"
- "Não confio"

## Output esperado
1. Roteiro completo por papel (SDR, BDR, Closer)
2. Top 5 objeções esperadas com tratamento em 4 passos
3. Frases de condução para cada etapa
4. Gatilhos de next-step

## Quando usar
Após a oferta estar validada, para preparar o time comercial.`
  },
  {
    title: "Hermes — CRM e Higiene de Dados (Fase 9)",
    category: "IA ACP",
    tags: ["ACP", "Fase 9", "CRM", "Hermes"],
    content: `# Hermes — CRM e Higiene de Dados

## Objetivo
Auditar a saúde do CRM e recomendar melhorias.

## Metas de higiene
- Campos obrigatórios preenchidos ≥ 90%
- Leads com próximo passo definido ≥ 80%
- Leads sem follow-up > 7 dias ≤ 10%

## Output esperado
1. Diagnóstico de saúde do CRM
2. Checklist de campos obrigatórios
3. Recomendações de pipeline e etapas
4. Regras de automação e higiene
5. Sugestões de dropdowns padronizados

## Quando usar
Periodicamente (mensal) para garantir a qualidade dos dados no CRM.`
  },
  {
    title: "Deméter — Nurture e Reativação (Fase 10)",
    category: "IA ACP",
    tags: ["ACP", "Fase 10", "Nurture", "Reativação", "Deméter"],
    content: `# Deméter — Nurture e Reativação

## Objetivo
Criar sequência de 14 dias e reativar leads frios.

## Sequência de nurture (14 dias)
- D1: Agradecimento
- D3: Conteúdo problema
- D5: Relance da oferta
- D7: Case de sucesso
- D10: Conteúdo objeção
- D12: Mensagem final
- D14: Classificação (reativou / recusou / não respondeu)

## Reativação de leads frios (60+ dias)
Mensagem específica para leads que não responderam após 60 dias.

## Output esperado
1. Sequência de 14 dias com templates
2. Mensagem de reativação para leads frios
3. Critérios de classificação de saída

## Quando usar
Para leads que não fecharam no primeiro contato, mantendo aquecimento.`
  },
  {
    title: "Cronos — KPI e Unit Economics (Fase 11)",
    category: "IA ACP",
    tags: ["ACP", "Fase 11", "KPIs", "Finanças", "Cronos"],
    content: `# Cronos — KPI e Unit Economics

## Objetivo
Calcular CAC, LTV, payback e margem com alertas de sanidade.

## Verificação de sanidade
- LTV ≥ 3× CAC
- Payback ≤ 6 meses
- Margem ≥ 30%

## Output esperado
1. Dashboard de indicadores
2. CAC por canal, ICP e vendedor
3. LTV estimado por perfil de cliente
4. Payback estimado
5. Alertas de anomalia
6. Recomendações de corte/escala

## Quando usar
Mensalmente para acompanhamento financeiro e ajustes de rota.`
  },
  {
    title: "Atena — Inteligência Competitiva (Fase 12)",
    category: "IA ACP",
    tags: ["ACP", "Fase 12", "Concorrência", "Atena"],
    content: `# Atena — Inteligência Competitiva

## Objetivo
Mapear concorrentes, identificar gaps e alimentar argumento comercial.

## Output esperado
1. Mapa competitivo (até 5 concorrentes)
2. Análise SWOT por concorrente
3. Gaps identificados que sua oferta preenche
4. Comparativo honesto sugerido
5. Briefing para time comercial: "por que nós e não o concorrente"

## Quando usar
Trimestralmente ou quando um novo concorrente relevante surge no mercado.`
  },
  {
    title: "Héstia — Retenção e Sinais de Churn (Fase 13)",
    category: "IA ACP",
    tags: ["ACP", "Fase 13", "Retenção", "Churn", "Héstia"],
    content: `# Héstia — Retenção e Sinais de Churn

## Objetivo
Monitorar 12 sinais de churn e classificar clientes em verde/amarelo/vermelho.

## 12 Sinais de Churn
1. Queda de uso do produto/serviço
2. Picos de suporte
3. Atraso em pagamento
4. Cancelamento de reunião
5. Redução de usuários
6. Inatividade do contato
7. Tom negativo nas interações
8. Falta de engajamento
9. Resistência a upgrade
10. Pedido de redução de escopo
11. Comparação com concorrente
12. Solicitação de dados para migração

## Classificação
- **Verde**: 0-1 sinais — monitorar
- **Amarelo**: 2-3 sinais — reunião de saúde em 7 dias
- **Vermelho**: 4+ sinais — escalada em 48h

## Quando usar
Monitoramento contínuo, com alertas automáticos.`
  },
  {
    title: "Zeus — Planejamento Trimestral (Fase 14)",
    category: "IA ACP",
    tags: ["ACP", "Fase 14", "Planejamento", "Zeus"],
    content: `# Zeus — Planejamento Trimestral

## Objetivo
Conduzir planejamento trimestral com metas SMART e Top 5 prioridades.

## Output esperado
1. Revisão do período anterior (Top 3 vitórias, fracassos, aprendizados)
2. Metas SMART para o próximo trimestre
3. Top 5 prioridades (com responsável, prazo, KPI)
4. Alocação sugerida de recursos
5. Checkpoints mensais programados
6. Backlog estratégico

## Quando usar
No final de cada trimestre para planejar o próximo período.`
  },
  {
    title: "Orquestrador ACP — Visão Geral do Método",
    category: "IA ACP",
    tags: ["ACP", "Visão Geral", "Metodologia"],
    content: `# Orquestrador ACP — Arquitetura de Crescimento Previsível

## O que é o ACP?
O **Método ACP v2.0** (Arquitetura de Crescimento Previsível) é um sistema de 14 agentes de IA organizados em 6 categorias que automatiza e estrutura o crescimento comercial de empresas B2B.

## As 6 Categorias

### 1. Estratégia
- **Atlas** (F1): Diagnóstico Comercial
- **Hera** (F2): Construção de ICP
- **Prometeu** (F3): Arquitetura de Oferta
- **Atena** (F12): Inteligência Competitiva

### 2. Aquisição
- **Mercúrio** (F4): Funil de Aquisição e Mídia
- **Iris** (F6): Mensagens e Criativos

### 3. Autoridade
- **Apolo** (F5): Funil de Autoridade e Conteúdo

### 4. Operação
- **Cadmo** (F7): Lead Scoring e Qualificação
- **Orfeu** (F8): Roteiros e Objeções
- **Hermes** (F9): CRM e Higiene de Dados
- **Deméter** (F10): Nurture e Reativação
- **Héstia** (F13): Retenção e Sinais de Churn

### 5. Gestão
- **Cronos** (F11): KPI e Unit Economics
- **Zeus** (F14): Planejamento Trimestral

## Como usar
1. Execute o **Scan** para mapear a presença digital do cliente
2. Execute a **Chain** para rodar todos os 14 agentes em sequência
3. Gere o **Plano de Execução** com cronograma e orçamento
4. Acompanhe os resultados pelo dashboard de métricas`
  },
  {
    title: "Guia Rápido: Scan de Presença Digital",
    category: "IA ACP",
    tags: ["ACP", "Scan", "Presença Digital"],
    content: `# Scan de Presença Digital

## O que é
O Scan ACP mapeia automaticamente a presença digital de um cliente ou prospect, coletando informações públicas sobre a empresa.

## Dados coletados
- Website e tecnologias utilizadas
- Perfil no Instagram e engajamento
- Presença no Google Meu Negócio
- CNPJ e dados cadastrais
- Menções e reputação online
- Concorrentes identificados

## Como usar no Orquestrador
1. Acesse o **Orquestrador ACP** no menu IA
2. Selecione a aba **Scan**
3. Informe o nome da empresa (e opcionalmente website, Instagram, CNPJ)
4. Clique em **Escanear**
5. Use o resultado como input para a **Chain** (cadeia completa)

## Dicas
- Quanto mais dados informar, mais preciso será o scan
- O scan alimenta todos os 14 agentes da chain
- Resultados ficam salvos no histórico do cliente`
  }
];

export function knowledgeBaseRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const { category, search, tags, tagFilter } = req.query;
      const where: any = { organizationId: req.user!.orgId };
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: "insensitive" } },
          { content: { contains: search as string, mode: "insensitive" } },
        ];
      }
      const articles = await prisma.knowledgeBase.findMany({ where, orderBy: { updatedAt: "desc" } });
      let result = articles;
      if (tags || tagFilter) {
        const filterTags = ((tags || tagFilter) as string).split(",").map(t => t.trim().toLowerCase());
        result = articles.filter(a => {
          const articleTags = a.tags ? JSON.parse(a.tags) : [];
          return filterTags.some(ft => articleTags.some((at: string) => at.toLowerCase().includes(ft)));
        });
      }
      res.json({ articles: result });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar artigos" });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const { title, content, category, tags, attachments } = req.body;
      if (!title || !content) return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
      const article = await prisma.knowledgeBase.create({
        data: { title, content, category, tags: tags ? JSON.stringify(tags) : undefined, attachments: attachments ? JSON.stringify(attachments) : undefined, createdById: req.user!.id, organizationId: req.user!.orgId },
      });
      res.json(article);
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar artigo" });
    }
  });

  router.post("/acp-seed", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.id;
      let created = 0;
      for (const article of ACP_METHOD_ARTICLES) {
        const exists = await prisma.knowledgeBase.findFirst({
          where: { organizationId: orgId, title: article.title }
        });
        if (!exists) {
          await prisma.knowledgeBase.create({
            data: {
              title: article.title,
              content: article.content,
              category: article.category,
              tags: JSON.stringify(article.tags),
              isPublished: true,
              createdById: userId,
              organizationId: orgId,
            }
          });
          created++;
        }
      }
      res.json({ success: true, created, total: ACP_METHOD_ARTICLES.length });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_ACP_SEED_ERROR]", error);
      res.status(500).json({ error: "Erro ao semear artigos ACP" });
    }
  });

  router.post("/acp-from-execution", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.id;
      const { executionId } = req.body;
      if (!executionId) return res.status(400).json({ error: "executionId é obrigatório" });

      const execution = await prisma.acpAgentExecution.findFirst({
        where: { id: executionId, organizationId: orgId }
      });
      if (!execution) return res.status(404).json({ error: "Execução não encontrada" });

      const agentId = execution.agentId;
      const agentConfig = ACP_METHOD_ARTICLES.find(a => a.tags.some(t => t.toLowerCase() === agentId.toLowerCase()));
      const category = agentConfig?.category || "IA ACP";

      const article = await prisma.knowledgeBase.create({
        data: {
          title: `${execution.agentName} — Resultado da Execução`,
          content: `# ${execution.agentName}\n\n## Input\n${execution.input}\n\n## Output\n${execution.output}`,
          category,
          tags: JSON.stringify(["ACP", agentId, "Execução"]),
          isPublished: true,
          createdById: userId,
          organizationId: orgId,
        }
      });
      res.json({ article });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_ACP_EXEC_ERROR]", error);
      res.status(500).json({ error: "Erro ao gerar artigo da execução" });
    }
  });

  router.get("/categories/list", async (req: AuthRequest, res) => {
    try {
      const categories = await prisma.knowledgeBase.groupBy({
        by: ["category"],
        where: { organizationId: req.user!.orgId, category: { not: null } },
        _count: { id: true },
      });
      res.json({ categories });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_CATEGORIES_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar categorias" });
    }
  });

  router.get("/:id", async (req: AuthRequest, res) => {
    try {
      const article = await prisma.knowledgeBase.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!article) return res.status(404).json({ error: "Artigo não encontrado" });
      await prisma.knowledgeBase.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
      res.json(article);
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_GET_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar artigo" });
    }
  });

  router.patch("/:id", async (req: AuthRequest, res) => {
    try {
      const { title, content, category, tags, isPublished, attachments } = req.body;
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (content !== undefined) data.content = content;
      if (category !== undefined) data.category = category;
      if (tags !== undefined) data.tags = JSON.stringify(tags);
      if (isPublished !== undefined) data.isPublished = isPublished;
      if (attachments !== undefined) data.attachments = JSON.stringify(attachments);
      const result = await prisma.knowledgeBase.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data,
      });
      if (!result.count) return res.status(404).json({ error: "Artigo não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar artigo" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.knowledgeBase.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Artigo não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar artigo" });
    }
  });

  return router;
}
