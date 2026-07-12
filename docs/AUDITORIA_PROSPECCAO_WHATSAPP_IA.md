# Auditoria - Maquina de Prospeccao WhatsApp com IA

Data: 2026-06-04

## Premissas

Esta auditoria foi feita sobre o codigo atual do Nexus360, nao apenas sobre uma descricao abstrata. O sistema ja possui uma base SaaS multi-tenant, CRM, agenda, funis, captura de leads, WhatsApp via WhatsMeow e algumas automacoes. O objetivo correto nao e reconstruir tudo, mas consolidar os blocos existentes em uma esteira unica, observavel e controlada.

Requisito de produto reforcado:

- Tudo que for criado no backend precisa ter visualizacao, configuracao ou monitoramento no frontend.
- Usar a paleta padrao do sistema (`--nexus-primary`, tons neutros, estados suaves).
- Evitar cores fortes, gradientes agressivos e botoes com destaque excessivo em telas operacionais.
- Priorizar geracao de reunioes qualificadas, nao volume bruto de mensagens.

## 1. Mapeamento atual

### Componentes existentes

#### Frontend

- `frontend/src/pages/prospecting/LeadCapture.tsx`
  - Tela principal de captacao via provedores externos.
  - Busca por nicho, cidade, UF, provedor e filtros.
  - Permite enriquecer, analisar, pesquisar decisores, enviar ao CRM e matricular em funil IA.
  - Tem tambem um modal de "Prospeccao + Agenda IA", mas parte dele ainda parece fluxo manual/hibrido.

- `frontend/src/pages/prospecting/ProspectingFunnels.tsx`
  - Mostra funis IA WhatsApp, etapas, regras operacionais e fila de runs.
  - Permite criar funil e atualizar funil padrao.
  - Ainda nao mostra painel completo de disparos, erros, opt-outs, distribuicao por numero, limites diarios e saude dos canais.

- `frontend/src/pages/prospecting/MissionsList.tsx`
  - Lista missoes agendadas do modulo `Nexus Prospect AI`.
  - Usa a rota `/api/nexus-prospect/missions`.
  - Representa a automacao por nicho/regiao/horario.

- `frontend/src/pages/WhatsApp.tsx`
  - Tela de instancias WhatsMeow, LLMs e mensagens.
  - Cria instancias, conecta por QR, lista conversas diretas e grupos, permite responder.
  - Tem botao "Disparar fila IA".
  - Ainda falta painel operacional de anti-ban, aquecimento, saude do numero, round-robin e historico cross-number por lead.

- `frontend/src/components/sidebar/Sidebar.tsx`
  - Ja inclui itens comerciais: captacao, missoes, funis IA WhatsApp, WhatsApp, CRM, Sales Machine e propostas.
  - A navegacao ja esta pronta para expor a maquina comercial, mas os modulos ainda aparecem fragmentados.

#### Backend Node/Express

- `backend/src/server.ts`
  - API Express multi-tenant com autenticacao, CORS por dominio, rate limit global e rotas protegidas por tenant.
  - Inicializa `MissionScheduler`, `AutomationWorker` e `FollowUpWorker` em memoria no mesmo processo.
  - Risco: workers acoplados ao processo HTTP dificultam escala horizontal e podem duplicar execucoes se houver mais de uma replica.

- `backend/src/modules/lead-capture/lead-capture.service.ts`
  - Captura leads de provedores Serper, SerpAPI e Outscraper.
  - Normaliza telefone, aplica filtros basicos e salva em `CapturedLead`.
  - Dedupe por `organizationId + provider + externalId`.
  - Pontua oportunidade com heuristica simples: telefone, site, rating, reviews, email/social.

- `backend/src/modules/lead-capture/providers/*`
  - Abstracao de provedores.
  - Pontos positivos: factory e interface ja existem.
  - Lacuna: falta um contrato comum mais rico para evidencias, origem, custo, confianca e erro por item.

- `backend/src/modules/lead-capture/lead-ai.service.ts`
  - Diagnostico com Groq.
  - Enriquecimento de CNPJ com Serper + BrasilAPI/MinhaReceita/MUAC.
  - Valida CNPJ por UF, cidade, nome, digito verificador, endereco, telefone e evidencias.
  - Pesquisa gestores via busca LinkedIn com Serper e extracao por LLM.
  - Gera scripts de abordagem.
  - Ponto forte: evita usar socios se a identidade empresarial nao estiver validada.

- `backend/src/routes/leadCapture.ts`
  - Endpoints de captura, analise, dossie, enriquecimento, decisores, envio ao CRM e listagem.
  - Ja tem endpoints importantes:
    - `POST /api/lead-capture/search`
    - `POST /api/lead-capture/leads/:id/enrich`
    - `POST /api/lead-capture/leads/:id/validate-company`
    - `GET /api/lead-capture/leads/:id/decision-makers`
    - `POST /api/lead-capture/leads/:id/decision-makers/refresh`
    - `POST /api/lead-capture/leads/:id/send-to-crm`

- `backend/src/routes/prospectingFunnels.ts`
  - Cria funis e etapas IA.
  - Matricula leads capturados em `ProspectingRun`.
  - Gera primeira mensagem curta e orientada a decisor.
  - Distribui responsavel entre usuarios ativos por departamento.
  - Ponto forte: regra explicita para nao falar com marketing e nao abrir pitch antes do decisor.

- `backend/src/services/prospectingAutomation.ts`
  - Config runtime do funil.
  - Normalizacao de decisores.
  - Escolha do melhor decisor.
  - Mensagem inicial.
  - Opt-out.
  - Registro de tentativas de disparo.
  - Ponto importante: e o melhor candidato para virar o "core" da maquina SDR.

- `backend/src/routes/whatsapp.ts`
  - Integra com bridge WhatsMeow.
  - Cria inbox/canal WhatsApp.
  - Envia mensagens manuais e de prospeccao.
  - Recebe webhooks internos.
  - Salva conversas e mensagens.
  - Gera logs de conexao e webhook.
  - Possui endpoint `POST /api/whatsapp/prospecting/dispatch`.
  - Ja bloqueia fora de horario comercial, por limite diario, telefone invalido e opt-out.

- `backend/src/services/whatsappIntelligence.ts`
  - Classificacao/tagueamento de conversas WhatsApp.
  - Boa base para evoluir intencao, decisor, objecoes e proximo passo.

- `backend/src/controllers/prospectController.ts` e `backend/src/routes/prospect.ts`
  - CRUD de missoes do `Nexus Prospect AI`.
  - Cria missoes com nicho, cidade, UF, data, horario, recorrencia, limite e abordagem.
  - Exibe metricas basicas.

- `backend/src/services/prospect/MissionScheduler.ts`
  - Scheduler em memoria que checa missoes a cada minuto.
  - Executa captura real via `LeadCaptureService`.
  - Roda inteligencia, filtros e matricula leads no funil default.
  - Tambem chama pipeline legado de agentes mock como fallback.

- `backend/src/services/prospect/*Agent.ts`
  - `LeadExtractorAgent`: mock de Google Places.
  - `LeadValidatorAgent`: validacao heuristica, marca WhatsApp como valido se telefone e valido.
  - `DossierAgent`: gera dossie mock/heuristico.
  - `FilterAgent`: aprova/reprova pelo score.
  - Estes agentes duplicam parte da trilha `CapturedLead + ProspectingRun` e devem virar legado ou ser absorvidos.

#### WhatsApp Bridge

- `whatsapp-bridge/main.go`
  - Bridge Go com WhatsMeow.
  - Usa SQLite para sessao.
  - Conecta por QR.
  - Envia texto.
  - Recebe texto, midia, contatos, localizacao, reacao, edicao, delete, grupos e mentions.
  - Faz webhook interno para `/api/internal/whatsapp/events`.
  - Risco: WhatsMeow e uma abordagem nao-oficial. Tem poder operacional, mas risco maior de banimento e instabilidade do que WhatsApp Business Platform oficial.

#### Banco de dados

Principais tabelas ja existentes para o objetivo:

- `LeadCaptureSource`: historico de buscas.
- `CapturedLead`: lead captado do Google/Maps/provedor.
- `CompanyIdentityCandidate`: candidatos de CNPJ e score.
- `CompanyIdentityAuditLog`: auditoria de validacao de identidade empresarial.
- `ProspectingDecisionMaker`: decisores identificados.
- `ProspectingFunnel`: funil IA WhatsApp.
- `ProspectingFunnelStage`: etapas/agentes do funil.
- `ProspectingRun`: execucao de um lead dentro do funil.
- `ProspectingDispatchAttempt`: tentativas de disparo.
- `ProspectingOptOutContact`: opt-out por telefone.
- `Inbox`, `Channel`, `Conversation`, `Message`: omnichannel.
- `WhatsappContactIdentity`, `WhatsappGroupParticipant`, `WhatsappMention`, `WhatsappConnectionLog`, `WhatsappWebhookLog`: persistencia operacional de WhatsApp.
- `CalendarEvent`, `Agenda`: base para agenda e reunioes.
- `Automation`, `AutomationLog`: motor generico de automacoes.
- `AiLog`: logs de IA.
- `Lead`, `Client`, `Opportunity`, `Pipeline`, `PipelineStage`: CRM.
- `ProspectMission`, `ProspectLead`, `ProspectValidation`, `ProspectDossier`, `ProspectOutreachMessage`, `ProspectConversation`, `ProspectAppointment`, `ProspectAgentLog`: modulo paralelo/legado de missoes.

### Como os componentes se conectam hoje

Fluxo manual/semi-automatico atual:

1. Usuario abre `LeadCapture`.
2. Busca leads por provedor.
3. Backend cria `LeadCaptureSource` e salva `CapturedLead`.
4. Usuario roda enriquecimento/analise/pesquisa de decisores.
5. Backend valida CNPJ e cria decisores.
6. Usuario envia lead ao CRM ou ao funil IA.
7. Backend cria `ProspectingRun`.
8. Usuario entra em `WhatsApp` e clica para disparar fila IA.
9. Backend escolhe uma instancia WhatsApp ativa.
10. Backend chama `whatsapp-bridge`.
11. Bridge envia mensagem.
12. Backend grava `Message` e `ProspectingDispatchAttempt`.
13. Respostas recebidas viram `Conversation`/`Message`.
14. O sistema atual ainda nao tem um motor IA pleno que responda automaticamente ate agendamento.

Fluxo agendado atual:

1. Usuario cria `ProspectMission` com nicho, local, horario e recorrencia.
2. `MissionScheduler` checa a cada minuto.
3. Ao chegar o horario, executa captura real via `LeadCaptureService`.
4. Roda enriquecimento/diagnostico/scripts.
5. Matricula leads aprovados no funil default.
6. O disparo WhatsApp ainda depende do endpoint de dispatch e nao esta claramente acoplado a uma fila persistente com delay/randomizacao por numero.

### Redundancias e dependencias desnecessarias

- Existem dois modelos de prospeccao:
  - Novo: `CapturedLead + ProspectingFunnel + ProspectingRun`.
  - Antigo/paralelo: `ProspectMission + ProspectLead + ProspectValidation + ProspectDossier`.
  - Recomendacao: manter `ProspectMission` como configuracao de campanha/scheduler, mas padronizar leads e conversas em `CapturedLead` e `ProspectingRun`.

- `LeadValidatorAgent` marca `whatsappValid = phoneValid`, o que nao valida WhatsApp de fato.

- `LeadExtractorAgent` ainda tem provider mock e salva em `ProspectLead`, enquanto a captura real salva em `CapturedLead`.

- `DossierAgent` tem texto mock e diagnostico focado em presenca digital/WhatsApp, diferente da diretriz atual de estrutura comercial.

- O disparo WhatsApp esta em rota HTTP (`POST /api/whatsapp/prospecting/dispatch`) em vez de job worker persistente com fila, tentativas, backoff e controle por numero.

- O frontend tem tres superficies para a mesma operacao: captacao, missoes e funis. Falta uma tela unificada de operacao outbound.

- A UI usa tons fortes e gradientes em pontos de prospeccao (`indigo/purple`, `emerald-600`, `green-600`), contrariando a regra visual solicitada.

## 2. O que pode ser aproveitado

### Altamente reutilizavel

- Multi-tenant com `Organization`, `User`, roles/permissoes e `resolveTenant`.
- Estrutura SaaS de planos, limites e `UsageEvent`.
- CRM completo: leads, clientes, oportunidades, pipelines, tarefas, calendario e propostas.
- Agenda propria (`CalendarEvent`, `Agenda`) para criar reunioes sem depender inicialmente de agenda externa.
- Omnichannel (`Inbox`, `Channel`, `Conversation`, `Message`).
- WhatsApp bridge com QR, envio, recebimento, grupos e midia.
- Normalizacao de WhatsApp em `backend/src/utils/whatsapp.ts`.
- Captura por Serper/SerpAPI/Outscraper.
- Enriquecimento de CNPJ com score e auditoria.
- `ProspectingDecisionMaker` e logica de escolha de decisor.
- `ProspectingDispatchAttempt` e opt-out.
- `ProspectingFunnel`/`ProspectingRun` como base do runtime SDR.
- Frontend ja tem rotas e sidebar para todos os blocos principais.

### Bom o suficiente para nao refazer agora

- A camada de auth/tenant.
- O CRM e pipeline comercial.
- A agenda interna.
- O registro de conversas e mensagens.
- O fluxo de QR e instancia WhatsApp via bridge.
- O modelo de captured leads.
- A validacao de CNPJ por score antes de usar socios.
- O primeiro funil IA com foco em localizar decisor.

### Adaptavel com baixo esforco

- Transformar `ProspectMission` em "Campaign/Scheduled Search" que alimenta `CapturedLead`.
- Expor `ProspectingDispatchAttempt` no frontend como log operacional.
- Expor `ProspectingOptOutContact` no frontend.
- Adicionar configuracao visual de limites por organizacao/funil/canal.
- Melhorar `ProspectingFunnels` para exibir metricas de conversao.
- Adicionar filtros por status em `ProspectingRun`.
- Substituir botoes/gradientes fortes por componentes e tokens visuais padronizados.

## 3. Gargalos e problemas

### Gargalos funcionais

- Nao existe validacao real de WhatsApp.
  - Hoje o sistema valida telefone, nao existencia/atividade no WhatsApp.
  - WhatsMeow pode tentar resolver JID/enviar, mas isso nao equivale a uma camada dedicada de validacao e risco.

- IA nao conduz conversa ponta a ponta.
  - O sistema grava mensagens e consegue responder manualmente.
  - Falta um Conversation Orchestrator que leia historico, classifique intencao, escolha proxima acao, gere resposta, pare por opt-out e agende reuniao.

- Decisor ainda depende principalmente de CNPJ/socios e busca LinkedIn por Serper.
  - Bom para dono/socio.
  - Fraco para "responsavel comercial", gerente, vendedor, closer ou pessoa operacional que influencia a agenda.

- Falta roteamento claro para "nao falar com marketing".
  - A regra aparece nos prompts.
  - Precisa virar regra de classificacao/estado: se cargo/departamento = marketing, responder pedindo comercial/dono ou encerrar.

- Agendamento ainda nao esta totalmente automatizado.
  - Existe `CalendarEvent`.
  - Falta motor de disponibilidade, sugestao de horarios, reserva, confirmacao, reagendamento e no-show.

### Gargalos de escala

- Workers rodam dentro do processo HTTP.
  - Risco de duplicidade com multiplas replicas.
  - Risco de perda de jobs em restart.
  - Dificulta observabilidade.

- Nao ha fila robusta.
  - O dispatch busca runs e envia em loop.
  - Falta BullMQ/Redis, pg-boss ou outro job queue persistente.

- Delay/randomizacao existe na configuracao, mas nao e aplicado no dispatch.
  - `randomDelayMinSeconds` e `randomDelayMaxSeconds` estao no runtime config.
  - O envio atual e sequencial imediato no request.

- Limite diario e por organizacao, nao por numero/portfolio/campanha/qualidade.
  - Para anti-ban, precisa granularidade por canal, numero, carteira, nicho, janela e status do numero.

- Escolha da instancia WhatsApp e simplista.
  - Usa um canal ativo mais recente.
  - Precisa round-robin ponderado por saude, volume diario, idade do numero, erro recente e resposta positiva.

### Riscos de banimento e compliance

- WhatsMeow e nao-oficial.
  - Bom para MVP/controlado.
  - Para SaaS escalavel, o caminho mais defensavel e suportar WhatsApp Business Platform/Cloud API ou BSP oficial, especialmente para clientes externos.

- "Anti-ban" nao deve ser entendido como burlar regras.
  - A arquitetura correta e controle de reputacao, opt-out, limites, qualidade, consentimento quando aplicavel e baixo atrito.
  - Rotacao agressiva de numeros sem reputacao e alto risco.

- Falta controle de qualidade por mensagem.
  - Nao ha medicao estruturada de bloqueio, denuncia, opt-out, resposta negativa, resposta positiva, taxa de reply e taxa de reuniao por template/campanha/numero.

- Falta warming/safety state por numero.
  - Novo, aquecendo, saudavel, atencao, risco, pausado.

- Falta politicas de cooldown.
  - Se aumentar opt-out ou erro de envio, pausar numero/campanha automaticamente.

### Problemas de arquitetura

- Duas fontes de verdade para leads de prospeccao (`CapturedLead` e `ProspectLead`).
- Duas camadas de "agente" com niveis diferentes de maturidade.
- Estado conversacional ainda esta em `Conversation/Message` e parcialmente em `ProspectingRun.qualification`, mas falta um `ConversationState` explicito para IA.
- Pouca separacao entre controle operacional e rota HTTP.
- Falta painel unico de observabilidade.
- Falta idempotencia forte em envio por telefone/campanha/janela.
- Falta dedupe por telefone normalizado entre provedores.
- Falta historico cross-number como requisito de produto: se trocar o numero remetente, a memoria do lead precisa continuar vinculada ao lead/conversa, nao ao canal antigo.

## 4. O que esta faltando

### Validador de WhatsApp

Criar modulo `WhatsAppValidationService`:

- Entrada: telefone, org, leadId, fonte.
- Saida: `valid`, `invalid`, `unknown`, `risk`, `checkedAt`, `provider`, `reason`.
- Cache por telefone.
- Status separado de telefone valido.
- Integracao com WhatsMeow inicialmente e adaptador para Cloud API/BSP quando disponivel.

Tabelas sugeridas:

- `WhatsappNumberValidation`
  - `organizationId`
  - `phone`
  - `displayPhone`
  - `status`
  - `provider`
  - `confidenceScore`
  - `checkedAt`
  - `rawData`

### Enriquecimento de decisor

Evoluir `ProspectingDecisionMaker`:

- Capturar origem e confianca.
- Diferenciar dono/socio, comercial, fechamento, atendimento, marketing.
- Campo `department`.
- Campo `isBlockedTarget` para marketing.
- Campo `contactPath`: direto, gatekeeper, site, LinkedIn, CNPJ, manual.

Regras:

- Priorizar dono/socio/administrador.
- Depois responsavel comercial/vendas.
- Marketing deve ser evitado, exceto para pedir direcionamento ao comercial/dono sem pitch.

### Motor de conversa com IA

Criar `ConversationOrchestrator`:

- Consumir mensagens inbound.
- Carregar memoria do lead.
- Detectar intencao:
  - decisor localizado
  - nao decisor
  - marketing
  - atendimento/bot
  - interessado
  - pediu assunto
  - quer valores
  - quer agendar
  - sem interesse
  - opt-out
  - caso sensivel
- Escolher proxima acao.
- Gerar resposta curta.
- Bloquear resposta se passar limites.
- Agendar handoff humano.
- Registrar resumo e estado.

Estados recomendados:

- `seeking_decision_maker`
- `waiting_decision_maker`
- `qualifying`
- `value_proposition_allowed`
- `scheduling`
- `meeting_booked`
- `human_handoff`
- `nurture`
- `lost`
- `opt_out`

### CRM interno

Ja existe. Falta integrar automaticamente:

- Criar/atualizar `Lead`, `Client` e `Opportunity` quando houver resposta real ou score minimo.
- Mover etapa conforme evento:
  - respondido
  - decisor localizado
  - qualificado
  - reuniao marcada
  - perdido
  - opt-out
- Salvar owner/responsavel comercial.
- Registrar atividades automaticamente.

### Sistema de agendamento proprio

Ja existe `CalendarEvent`, mas falta:

- Motor de disponibilidade por usuario/agenda.
- Duracao padrao por campanha.
- Janelas permitidas.
- Buffer entre reunioes.
- Sugestao de 2-3 horarios.
- Confirmacao textual.
- Criacao de meeting link.
- Reagendamento/cancelamento.
- No-show e follow-up pos no-show.

### Rotacao de numeros

Criar `WhatsAppSenderPool`:

- Selecionar numero por:
  - ativo/conectado
  - limite diario
  - limite por hora
  - taxa de erro
  - taxa de resposta
  - taxa de opt-out
  - idade/aquecimento
  - nicho/campanha
  - consultor responsavel
- Preservar historico por lead independentemente do numero.
- Nunca perder memoria ao trocar canal.

Tabelas sugeridas:

- `WhatsappSenderProfile`
- `WhatsappSenderDailyQuota`
- `WhatsappSenderHealthMetric`
- `LeadChannelIdentity`

### Scheduler de automacao

Trocar scheduler em memoria por job queue:

- Opcoes:
  - BullMQ + Redis.
  - pg-boss em Postgres.
  - Temporal se quiser orquestracao mais robusta no futuro.

Jobs:

- `capture.leads`
- `enrich.lead`
- `validate.whatsapp`
- `select.decision_maker`
- `enqueue.outreach`
- `send.whatsapp`
- `process.inbound`
- `ai.reply`
- `book.meeting`
- `sync.crm`
- `cooldown.sender`

### Memoria de conversa

Criar memoria por lead/campanha:

- Resumo progressivo.
- Ultimas mensagens relevantes.
- Decisor confirmado.
- Pessoas que nao decidem.
- Preferencias de horario.
- Objecoes.
- Opt-out.
- Proximo passo.

Nao prender a memoria ao numero remetente. A chave deve ser lead/telefone/organizacao/campanha, com canais como meios de transporte.

## 5. Nova arquitetura ideal

### Fluxo completo

```text
[Campaign Scheduler]
  -> define nicho, regiao, quantidade, janela, recorrencia, regras de abordagem

[Lead Capture]
  -> Serper / SerpAPI / Outscraper / Google Places provider
  -> normaliza empresa, endereco, telefone, website, rating, reviews
  -> salva em CapturedLead

[Lead Dedup + Quality Gate]
  -> dedupe por provider externalId
  -> dedupe por phoneNormalized, placeId, website e nome+cidade
  -> remove contador, bot suspeito, telefone ruim, duplicado e blacklist

[Company Identity Enrichment]
  -> busca CNPJ
  -> valida UF/cidade/nome/digito/evidencia
  -> salva CompanyIdentityCandidate e AuditLog
  -> se score baixo: needs_review e nao usa socios

[Decision Maker Enrichment]
  -> CNPJ QSA
  -> site/social/search
  -> classifica cargo/departamento
  -> bloqueia marketing como alvo principal
  -> escolhe melhor decisor

[WhatsApp Validation]
  -> valida telefone como WhatsApp
  -> salva cache e confianca
  -> invalido/unknown nao entra em envio automatico sem regra especifica

[Prospecting Funnel Runtime]
  -> cria ProspectingRun
  -> define mensagem inicial e estado
  -> define responsavel e sender pool

[Sender Pool + Queue]
  -> escolhe numero saudavel
  -> aplica limite por numero/org/campanha
  -> aplica horario comercial e delay randomico
  -> registra DispatchAttempt

[WhatsApp Transport]
  -> WhatsMeow bridge para MVP
  -> WhatsApp Cloud API/BSP como caminho SaaS oficial
  -> grava outbound em Conversation/Message

[Inbound Webhook]
  -> grava mensagem
  -> atualiza identidade do contato
  -> detecta opt-out
  -> dispara ConversationOrchestrator

[AI Conversation Orchestrator]
  -> le memoria
  -> classifica intencao
  -> decide: responder, pedir decisor, qualificar, agendar, handoff, parar
  -> gera resposta curta
  -> enfileira envio

[Meeting Engine]
  -> consulta agenda
  -> sugere horarios
  -> confirma horario
  -> cria CalendarEvent
  -> cria/atualiza Opportunity

[CRM + Analytics]
  -> pipeline comercial
  -> dashboards de resposta, reuniao, ban risk, canais e conversao
```

### Separacao por modulos

- `lead-capture`
  - provedores, normalizacao, dedupe, busca.

- `lead-enrichment`
  - CNPJ, socios, decisores, fontes externas.

- `whatsapp-validation`
  - validacao e cache de numeros.

- `prospecting-runtime`
  - funis, runs, estado, decisao de proxima acao.

- `sender-pool`
  - rotacao, quotas, saude do numero, cooldown.

- `conversation-ai`
  - orquestracao de resposta, prompts, memoria, intencao.

- `meeting-engine`
  - disponibilidade, proposta de horarios, eventos.

- `crm-sync`
  - lead, cliente, oportunidade, atividades.

- `observability`
  - logs, metricas, dashboards, alertas.

### Tecnologias recomendadas

Manter:

- Node.js/Express + Prisma + Postgres.
- React/Vite/Tailwind.
- WhatsMeow para MVP/controlado.
- Groq/OpenAI/Gemini por adaptador.

Adicionar:

- Redis + BullMQ ou pg-boss.
- Event/job table persistente.
- Feature flags por organizacao/plano.
- Provider abstraction para WhatsApp:
  - `WHATS_MEEOW` para bridge atual.
  - `META_CLOUD_API` para WhatsApp Business Platform.
  - `BSP` para Zenvia/Take/360dialog/etc.

Arquitetura SaaS recomendada:

- HTTP API sem workers criticos acoplados.
- Worker separado para jobs.
- Bridge WhatsApp separado.
- DB Postgres como fonte de verdade.
- Redis/queue para atraso, retry e escala.
- Frontend com painel de controle operacional.

### Como os dados fluem

- `LeadCaptureSource` cria lote.
- `CapturedLead` guarda lead bruto normalizado.
- `CompanyIdentityCandidate` e `CompanyIdentityAuditLog` validam identidade.
- `ProspectingDecisionMaker` guarda decisores.
- `WhatsappNumberValidation` valida canal.
- `ProspectingRun` vira estado comercial da prospeccao.
- `ProspectingDispatchAttempt` audita cada envio.
- `Conversation/Message` guardam historico real.
- `ConversationMemory` guarda contexto interpretado.
- `CalendarEvent` guarda reuniao.
- `Opportunity` representa valor comercial no CRM.

## 6. Plano de implementacao

### Fase 1 - Ajustes rapidos

Prioridade: alta

Objetivo: melhorar controle, visibilidade e reduzir risco imediatamente.

O que fazer:

- Consolidar visual das telas de prospeccao e WhatsApp.
  - Remover gradientes fortes e botoes roxo/verde agressivos.
  - Usar `bg-primary`, `bg-primary/10`, neutros, bordas suaves e estados discretos.
  - Padronizar cards com raio menor e leitura operacional.

- Criar no frontend um painel operacional basico:
  - runs na fila
  - enviados hoje
  - falhas
  - opt-outs
  - conversas respondidas
  - reunioes marcadas
  - instancias ativas

- Expor `ProspectingDispatchAttempt` e `ProspectingOptOutContact` na UI.

- Aplicar delay randomico ja existente no runtime config.

- Adicionar limite por canal/numero, nao apenas organizacao.

- Adicionar dedupe por telefone normalizado em `CapturedLead`.

- Parar envio automatico para leads `cnpjStatus != validated` quando a mensagem citar socio.

- Criar regra forte no frontend/backend:
  - alvo marketing = nao pitch, pedir comercial/dono ou parar.

Impacto:

- Mais seguranca operacional.
- Menos risco de mensagens ruins.
- Mais clareza para operar a maquina.
- Ganho imediato sem grande refatoracao.

### Fase 2 - Estrutura base

Prioridade: alta

Objetivo: transformar a prospeccao em runtime escalavel.

O que fazer:

- Introduzir fila persistente:
  - BullMQ/Redis ou pg-boss.
  - Separar worker do processo HTTP.

- Migrar `MissionScheduler` para job scheduler.

- Unificar dados:
  - `ProspectMission` continua como campanha/agendamento.
  - `CapturedLead` vira lead oficial de prospeccao.
  - `ProspectLead` vira legado ou view historica.

- Criar `WhatsappNumberValidation`.

- Criar `WhatsappSenderProfile` e quotas por numero.

- Criar `ConversationMemory` e `ProspectingConversationState`.

- Criar dashboard "Maquina Outbound":
  - campanhas
  - funis
  - filas
  - numeros
  - saude
  - conversas
  - agenda

Impacto:

- Base para escalar com previsibilidade.
- Menos duplicidade.
- Menos risco de job perdido ou duplicado.
- Operacao passa a ser produto, nao script.

### Fase 3 - Inteligencia IA + decisao

Prioridade: alta

Objetivo: IA conduzir conversa ate agenda com seguranca.

O que fazer:

- Criar `ConversationOrchestrator`.

- Criar classificador de intencao:
  - decisor
  - gatekeeper
  - marketing
  - interessado
  - sem interesse
  - opt-out
  - agendamento
  - caso sensivel

- Criar motor de proxima acao:
  - pedir decisor
  - explicar assunto de forma curta
  - qualificar
  - oferecer horarios
  - handoff humano
  - parar

- Criar prompt library por etapa.

- Registrar `AiLog` para toda decisao importante.

- Criar agendamento automatico:
  - disponibilidade
  - sugestao de horarios
  - confirmacao
  - `CalendarEvent`
  - link de reuniao
  - oportunidade no CRM

- Criar painel de conversa IA:
  - estado atual
  - proxima acao
  - decisor detectado
  - resumo
  - confianca
  - botao "assumir manualmente"

Impacto:

- A maquina deixa de ser disparador e vira SDR.
- Aumenta taxa de resposta qualificada.
- Reduz conversa perdida.
- Comeca a medir reuniao como metrica final.

### Fase 4 - Escala multi numeros + automacao total

Prioridade: media/alta

Objetivo: operar volume com controle de reputacao e SaaS.

O que fazer:

- Sender pool completo:
  - round-robin ponderado
  - limite por numero/hora/dia
  - cooldown automatico
  - warming
  - saude por numero

- Suporte a WhatsApp Cloud API/BSP oficial em paralelo ao WhatsMeow.

- Modelo de compliance:
  - opt-out global
  - blacklist
  - suppression list
  - politicas por nicho/campanha
  - logs de consentimento quando aplicavel

- Aprendizado por campanha:
  - resposta por nicho
  - resposta por primeira mensagem
  - conversao por decisor
  - opt-out por numero
  - reuniao por 100 leads

- Automacao total:
  - campanha recorrente
  - captura
  - validacao
  - enriquecimento
  - fila
  - envio
  - conversa IA
  - agendamento
  - CRM
  - follow-up

Impacto:

- Escala operacional.
- Reducao de risco.
- Produto SaaS vendavel.
- Metrica principal vira reuniao qualificada agendada.

## Recomendacao executiva

A direcao tecnica recomendada e:

1. Manter o Nexus360 como plataforma SaaS.
2. Consolidar a maquina outbound em cima de `CapturedLead`, `ProspectingRun`, `Conversation`, `Message`, `CalendarEvent` e CRM.
3. Rebaixar `ProspectLead`/agentes mock para legado ou migrar para a nova trilha.
4. Criar fila persistente e sender pool antes de aumentar volume.
5. Criar IA conversacional depois que o estado operacional estiver confiavel.
6. Expor tudo no frontend desde o inicio, com visual discreto e padrao Nexus.

## Observacoes sobre WhatsApp

Para MVP controlado, WhatsMeow pode continuar sendo usado, desde que haja limites conservadores, opt-out e monitoramento de saude.

Para SaaS escalavel, a arquitetura deve suportar WhatsApp Business Platform/Cloud API ou BSP oficial. As regras de limites, qualidade e templates mudam com frequencia; antes de implementar volume alto, validar diretamente nas documentacoes oficiais da Meta:

- https://developers.facebook.com/docs/whatsapp/
- https://developers.facebook.com/docs/whatsapp/messaging-limits/
- https://developers.facebook.com/docs/whatsapp/cloud-api/
- https://developers.facebook.com/docs/whatsapp/message-templates/

