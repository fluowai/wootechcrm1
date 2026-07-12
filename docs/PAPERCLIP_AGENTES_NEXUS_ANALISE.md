# Analise Paperclip x Nexus: agentes autonomos com governanca

Data: 2026-07-11

## Resumo executivo

O Paperclip se posiciona como um "control plane" para trabalho de agentes: o usuario define uma missao, contrata agentes em um organograma, aprova a estrategia, define orcamentos e acompanha execucoes por tickets, heartbeats e logs.

Para o Nexus, a melhor oportunidade nao e copiar o Paperclip como produto generico. O caminho mais forte e adaptar esse modelo para uma central autonoma vertical de agencia/CRM/comercial:

- CTO Agent: supervisiona arquitetura, releases, bugs, integracoes, custos e qualidade tecnica.
- CEO/Strategy Agent: transforma objetivos da organizacao em planos trimestrais, projetos e prioridades.
- SDR Agent: ja existe em parte via `SdrAgentWorker`; deve virar agente gerenciado por missao, budget e logs.
- CS Agent: monitora clientes, risco de churn, entregas, reunioes, contratos e follow-ups.
- Marketing/Ops Agent: cria campanhas, criativos, tarefas, calendarios e rotinas.

O Nexus ja tem pecas importantes: `AiAgent`, `AiUsageLedger`, `AiEntitlement`, `AgentQueueItem`, `Automation`, `Task`, `Project`, workers de SDR/follow-up e a Central de Agentes. Falta transformar essas pecas em um sistema persistente de empresas de agentes: organograma, heartbeat, tickets/runs, aprovacoes, memoria, relatorios e controle fino de autonomia.

## O que o Paperclip faz bem

Principios identificados:

1. Missao no topo
   - Todo trabalho nasce de uma meta clara.
   - Tarefas carregam contexto de missao, projeto e agente.

2. Agentes como funcionarios
   - Cada agente tem cargo, chefe, escopo, instrucoes e budget.
   - O usuario gerencia uma equipe, nao uma tela de prompt.

3. Heartbeats
   - O agente acorda por agenda, atribuicao, mencao ou acao manual.
   - Executa um ciclo curto, registra o que fez e dorme.

4. Tickets e rastreabilidade
   - Toda conversa, decisao e chamada de ferramenta fica ligada a um ticket/run.
   - Isso evita "IA invisivel" tomando decisoes sem historico.

5. Governanca
   - Aprovar contratacoes, pausar agentes, revisar estrategias, limitar custo.
   - A autonomia e configuravel por agente e por tipo de acao.

6. Bring your own agent
   - O runtime pode ser Codex, Claude, Cursor, HTTP webhook, script ou outro.
   - O sistema centraliza gestao, nao substitui todos os agentes.

## O que o Nexus ja tem

Arquivos relevantes:

- `backend/prisma/schema.prisma`
  - `AiAgent`: cadastro de agentes por organizacao.
  - `AiEntitlement`: limites/cotas por org, cliente, agente e modelo.
  - `AiUsageLedger`: ledger de uso, tokens, creditos, modelo e status.
  - `AgentQueueItem`: fila de acoes de agentes para clientes.
  - `Automation` e `AutomationLog`: automacoes por eventos.
  - `ProspectMission`, `ProspectAgentLog`: missoes de prospeccao.

- `backend/src/services/aiGovernance.ts`
  - Politica de modelos permitidos por plano.
  - Controle de requests, tokens e creditos diarios/mensais.
  - Registro de uso em ledger.

- `backend/src/services/aiExecution.ts`
  - Execucao de texto governada por agente, modelo, org, usuario e canal.

- `backend/src/services/agentQueue.ts`
  - Converte outputs de agentes em projetos, tarefas, campanhas, criativos e demandas.

- `backend/src/workers/sdrAgentWorker.ts`
  - Um agente real autonomo de SDR, com ciclo recorrente, memoria parcial, despacho WhatsApp e handoff.

- `backend/src/workers/smartFollowUpWorker.ts`
  - Rotinas autonomas de follow-up, lembrete de reuniao, pos-reuniao e contrato.

- `frontend/src/pages/settings/AgentsHub.tsx`
  - UI de agentes ainda orientada a execucao manual de prompts.

## Lacunas atuais

1. Falta organograma de agentes
   - `AiAgent` nao tem `role`, `title`, `reportsToId`, `autonomyLevel`, `heartbeatEnabled`, `heartbeatInterval`.

2. Falta conceito de run/heartbeat padronizado
   - Hoje ha workers e filas especificas, mas nao uma tabela central de `AgentRun`.
   - Isso dificulta dashboard de "o que cada agente fez".

3. Falta tickets como unidade universal
   - `Task`, `AgentQueueItem`, `ProspectMission` e `AutomationLog` estao separados.
   - O ideal e uma camada "AgentTicket" que ligue tarefa, cliente, projeto, run, aprovacao e output.

4. Falta aprovacao antes de acoes sensiveis
   - O Paperclip trata estrategia, contratacao de agentes e acoes criticas como aprovacoes.
   - No Nexus, isso seria essencial para enviar mensagem, criar campanha, mover oportunidade, publicar landing page ou mexer em contrato.

5. Falta memoria operacional por agente
   - Existem JSONs em alguns fluxos, mas nao uma memoria padronizada por agente/org/cliente.

6. Falta UI de autonomia
   - A Central de Agentes ainda e "escolha agente + cole input + executar".
   - Precisa virar "equipe de agentes", com status, proximos heartbeats, fila, custos, alertas e aprovacoes.

## Proposta: Nexus AgentOps

Criar um modulo "AgentOps" dentro do Nexus para coordenar agentes autonomos.

### 1. Modelos novos ou extensoes

Extender `AiAgent`:

- `role`: CEO, CTO, SDR, CMO, CS, Ops, Legal, Worker.
- `title`: nome exibido no organograma.
- `reportsToId`: agente superior.
- `autonomyLevel`: manual, assistido, semi_autonomo, autonomo.
- `heartbeatEnabled`: boolean.
- `heartbeatIntervalMinutes`: numero.
- `lastHeartbeatAt`, `nextHeartbeatAt`.
- `monthlyBudgetCredits`, `dailyBudgetCredits`.
- `instructions`: prompt operacional ou ponte para bundle.
- `memory`: JSON com fatos duraveis.
- `permissions`: JSON com acoes permitidas.

Criar `AgentRun`:

- `id`, `organizationId`, `agentId`, `ticketId`.
- `wakeReason`: schedule, assignment, manual, approval, webhook.
- `status`: queued, running, completed, failed, blocked, skipped.
- `input`, `output`, `summary`, `toolCalls`, `error`.
- `tokensIn`, `tokensOut`, `credits`, `estimatedCost`.
- `startedAt`, `completedAt`.

Criar `AgentTicket`:

- `id`, `organizationId`, `clientId`, `projectId`, `taskId`.
- `goalId` ou `mission`.
- `title`, `description`, `status`, `priority`.
- `createdByType`: user, agent, automation.
- `assigneeAgentId`, `parentTicketId`, `dependsOnTicketId`.
- `approvalRequired`, `approvalStatus`.
- `result`, `auditTrail`.

Criar `AgentApproval`:

- `id`, `organizationId`, `agentId`, `ticketId`.
- `type`: strategy, hire_agent, send_message, publish, contract, budget_change.
- `proposal`, `riskLevel`, `status`, `reviewedBy`, `reviewedAt`.

Criar `AgentMemory`:

- `organizationId`, `agentId`, `clientId?`, `key`, `value`, `sourceRunId`.
- Uso: guardar fatos duraveis, decisoes, preferencias, playbooks, contexto de cliente.

### 2. Heartbeat central

Criar um worker `AgentHeartbeatWorker` que:

1. Busca agentes ativos com `nextHeartbeatAt <= now`.
2. Verifica budget via `AiUsageLedger`/`AiEntitlement`.
3. Busca tickets pendentes do agente.
4. Monta contexto: missao da org, cliente, tarefas, memoria, permissoes.
5. Executa `runGovernedAiText`.
6. Salva `AgentRun`.
7. Cria tarefas, comentarios, aprovacoes ou outputs.
8. Agenda o proximo heartbeat.

Esse worker deve reaproveitar `runGovernedAiText` e `recordAiUsage`, sem criar outra camada de custo.

### 3. CTO Agent para o Nexus

O primeiro agente estrategico recomendado e o CTO Agent.

Responsabilidades:

- Ler fila de bugs, releases, incidentes e demandas tecnicas.
- Priorizar riscos de seguranca, regressao e estabilidade.
- Abrir tickets tecnicos com criterio de aceite.
- Revisar logs de erro e sugerir correcoes.
- Propor melhorias de arquitetura.
- Criar plano semanal tecnico.
- Solicitar aprovacao antes de deploy, migracao, alteracao de billing, alteracao de auth ou mudancas destrutivas.

Heartbeat inicial:

1. Checar tickets tecnicos abertos.
2. Checar ultimos erros de `AiLog`, `AutomationLog`, `AgentQueueItem` e workers.
3. Checar uso de IA e custos por agente.
4. Identificar P0/P1.
5. Criar ou atualizar `AgentTicket`.
6. Gerar resumo para o painel.
7. Se houver acao sensivel, criar `AgentApproval`.

### 4. UI recomendada

Substituir ou evoluir `AgentsHub` para quatro telas:

1. Visao da empresa de agentes
   - Organograma, status, custos, proximos heartbeats.

2. Board de tickets
   - Backlog, Ready, Running, Waiting Approval, Done, Failed.

3. Runs e auditoria
   - Cada execucao com input, output, custo, decisao e resultado.

4. Aprovacoes
   - Fila simples: aprovar, rejeitar, pedir revisao, pausar agente.

### 5. Roadmap sugerido

Fase 1: Base AgentOps

- Extender `AiAgent`.
- Criar `AgentRun`, `AgentTicket`, `AgentApproval`.
- Criar endpoints CRUD basicos.
- Criar dashboard simples de agentes e runs.

Fase 2: Heartbeats

- Criar `AgentHeartbeatWorker`.
- Criar wake reasons: manual, schedule, assignment.
- Integrar com `AiUsageLedger`.
- Criar pausa automatica por budget.

Fase 3: CTO Agent

- Criar template de instrucoes do CTO.
- Criar rotina diaria/semanal.
- Conectar com logs, tasks, releases e monitor.
- Criar aprovacoes para deploy/migracoes/config sensivel.

Fase 4: Vertical comercial

- Transformar SDR, CS, Marketing e Ops em agentes gerenciados.
- Unificar `AgentQueueItem` com `AgentTicket`.
- Converter outputs em tarefas, campanhas, criativos, follow-ups e oportunidades.

Fase 5: Autonomia controlada

- Autonomy policies por acao.
- Aprovacoes por risco.
- Memoria duravel por cliente.
- Relatorios automaticos para o dono/agencia.

## Recomendacao final

Implementar Paperclip dentro do Nexus como "AgentOps" e nao como clone.

O Nexus ja tem uma vantagem que o Paperclip generico nao tem: dados de CRM, vendas, prospeccao, WhatsApp, contratos, propostas, clientes, tarefas e faturamento. Isso permite agentes realmente operacionais, que nao apenas falam, mas criam trabalho, movem processos, avisam humanos e acompanham resultado.

O primeiro MVP deve ser:

1. CTO Agent autonomo com heartbeat diario.
2. AgentTicket + AgentRun.
3. Dashboard de organograma/custos/runs.
4. Aprovacoes para acoes sensiveis.
5. Reaproveitamento de `runGovernedAiText`, `AiUsageLedger` e `AgentQueueItem`.

Esse MVP ja entrega a mudanca central: sair de "eu peço para a IA fazer" para "eu gerencio uma equipe que trabalha e me pede aprovacao quando precisa".

