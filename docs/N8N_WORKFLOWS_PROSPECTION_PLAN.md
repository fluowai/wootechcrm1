# Analise dos fluxos n8n para prospeccao automatica na Nexus

Data: 2026-06-23

## Objetivo

Analisar os workflows n8n recebidos e definir o que pode ser aproveitado na Nexus para montar uma maquina de prospeccao automatica de leads, usando a base ja existente do Nexus360: captacao, CRM, WhatsApp, funis IA, agenda, conversas e automacoes.

Arquivos analisados:

- `Inbound Agente I.A Vendas: n8n + ultravox + twillio TEMPLATE`
- `I.A + Twillio + UltraVox`
- `Google Maps Scraper`
- `InstaFlow Automacao Com IA`
- `Agente SDR - Curso Academia`
- `FLUXO BUSCA LEADS LINKEDIN - Template`
- `Contactiva PRO - Versao 3.1`

## Leitura executiva

A Nexus ja tem a base mais importante para nao depender de n8n como core: `LeadCaptureSource`, `CapturedLead`, enriquecimento com IA/CNPJ, `ProspectingFunnel`, `ProspectingRun`, WhatsMeow, omnichannel, CRM e agenda.

O que vale aproveitar dos fluxos n8n nao e a arquitetura em si, mas os padroes de operacao:

- Busca recorrente de leads por nicho/regiao.
- Paginacao e deduplicacao em capturas externas.
- Separacao entre captura, enriquecimento, abordagem e follow-up.
- Fila curta para agrupar mensagens antes de responder com IA.
- Memoria por contato/conversa.
- SDR conversacional que pergunta uma coisa por vez e salva respostas.
- Follow-up automatico por agenda.
- Reescrita de mensagens antes do envio.
- Voz inbound com Twilio/UltraVox para triagem e resumo.
- Instagram Direct/comentarios como canal futuro de aquisicao e atendimento.

O que nao vale importar diretamente:

- Google Sheets como banco operacional.
- Supabase externo paralelo ao banco da Nexus.
- ClickUp como CRM principal.
- Redis usado sem trilha persistente/auditoria.
- Agentes que mandam mensagens sem limites, opt-out, horario comercial e controle por numero.
- Templates com credenciais, URLs fixas ou dados de terceiros.
- Duplicacao de modelos de lead fora de `CapturedLead` e `ProspectingRun`.

## Analise por fluxo

### 1. Google Maps Scraper

Resumo:

- Workflow com 20 nos.
- Usa `Schedule Trigger` e `Manual Trigger`.
- Le consultas do Google Sheets.
- Chama SerpAPI para Google Maps.
- Trata paginacao via parametro `start`.
- Remove vazios e duplicados.
- Grava resultados em Google Sheets.
- Atualiza status de sucesso/erro na planilha.

O que aproveitar:

- Modelo de "campanha de busca" com nicho, localidade, status, execucao e erro.
- Loop de paginacao em SERP/Maps.
- Normalizacao inicial antes de persistir.
- Dedupe antes de enviar para a base principal.
- Status por busca: pendente, rodando, sucesso, erro.

Como encaixar na Nexus:

- Substituir Google Sheets por `ProspectMission` como configuracao de busca.
- Salvar resultados em `LeadCaptureSource` e `CapturedLead`.
- Usar provedores ja existentes em `LeadCaptureService`: Serper, SerpAPI e Outscraper.
- Registrar custo, pagina, query, cidade, UF e provider em metadata.
- Rodar por worker persistente, nao apenas chamada manual.

Prioridade: alta.

### 2. FLUXO BUSCA LEADS LINKEDIN - Template

Resumo:

- Workflow com 11 nos.
- Usa SerpAPI para buscar perfis/dados no LinkedIn.
- Faz paginacao.
- Extrai dados via codigo.
- Grava em Google Sheets.

O que aproveitar:

- Pesquisa de decisores por busca externa.
- Paginacao simples.
- Extracao de nome/cargo/link a partir dos resultados.

Como encaixar na Nexus:

- Usar como referencia para fortalecer `LeadAiService` na etapa de decisores.
- Persistir em `ProspectingDecisionMaker`.
- Relacionar cada decisor ao `CapturedLead`.
- Dar score por fonte, cargo e confianca.
- Nunca usar decisor em mensagem se a empresa/CNPJ ainda estiver inconsistente.

Prioridade: alta.

### 3. Agente SDR - Curso Academia

Resumo:

- Workflow com 58 nos.
- Recebe webhook de WhatsApp/Evolution.
- Consulta/cadastra cliente no Supabase.
- Trata texto, audio e imagem.
- Transcreve audio com OpenAI.
- Analisa imagem com OpenAI.
- Usa Redis para agrupar mensagens antes de responder.
- Usa agente IA com memoria por telefone.
- Faz exatamente algumas perguntas de qualificacao.
- Salva respostas com ferramenta de banco.
- Divide resposta em mensagens menores.
- Envia via API WhatsApp.
- Tem schedule para follow-up.

O que aproveitar:

- Padrao conversacional SDR: perguntar uma coisa por vez.
- Persistencia imediata de cada resposta do lead.
- Tratamento multimodal: texto, audio e imagem.
- Buffer de mensagens para evitar responder antes do lead terminar de digitar.
- Follow-up automatico quando o lead para de responder.
- Divisao de resposta longa em varias mensagens curtas.

Como encaixar na Nexus:

- Entrada via `POST /api/internal/whatsapp/events`.
- Memoria em `Conversation` e `Message`, nao em memoria volatil.
- Estado do funil em `ProspectingRun`.
- Respostas qualificadoras em campos estruturados ou metadata do run.
- Follow-up em worker com `ProspectingRun.nextActionAt`.
- Handoff para humano quando houver interesse, objecao forte, pedido de preco ou pedido de agenda.
- Criar/atualizar `Lead`, `Opportunity` e `CalendarEvent` quando qualificado.

Prioridade: muito alta.

### 4. InstaFlow Automacao Com IA

Resumo:

- Workflow com 74 nos.
- Recebe webhooks GET/POST do Instagram.
- Valida echo para evitar loop.
- Verifica se usuario segue o perfil.
- Responde comentarios.
- Envia Direct.
- Atualiza token mensalmente.
- Usa Supabase para token/configuracoes.
- Usa Redis para buffer.
- Usa memoria Postgres por usuario.
- Usa agente Gemini.
- Transcreve audio.
- Divide mensagens para Direct.
- Usa regras de palavra-chave e links.

O que aproveitar:

- Canal Instagram como fonte de lead e conversa.
- Webhook verification GET/POST.
- Anti-loop por echo/from_id.
- Checagem de seguidores antes de liberar certos fluxos.
- Token refresh programado.
- Resposta a comentario com convite para Direct.
- Buffer de mensagens.
- Memoria por usuario/canal.
- Parser para dividir respostas longas.

Como encaixar na Nexus:

- Tratar Instagram como canal futuro em `Inbox`, `Channel`, `Conversation`, `Message`.
- Criar `InstagramConnection` ou usar `Channel.provider = INSTAGRAM`.
- Guardar token por organizacao com rotacao e logs.
- Enviar leads quentes do Instagram para CRM igual WhatsApp.
- Manter como fase 2, depois da maquina WhatsApp estar estavel.

Prioridade: media.

### 5. Inbound Agente I.A Vendas: n8n + ClickUp CRM + UltraVox + Twilio

Resumo:

- Workflow com 33 nos.
- Recebe webhook Twilio.
- Cria chamada UltraVox.
- Cadastra lead em Supabase.
- Cadastra/atualiza tarefa no ClickUp.
- Recebe relatorio de fim de chamada.
- Busca contexto no CRM.
- Usa OpenAI para consolidar resumo.
- Atualiza banco/CRM.

O que aproveitar:

- Voz inbound para qualificar lead automaticamente.
- Resposta ao Twilio com URL/parametros da chamada criada na UltraVox.
- Relatorio de fim de chamada como evento de enriquecimento.
- Consolidacao de contexto CRM com resumo novo.
- Atualizacao de status e historico pos-chamada.

Como encaixar na Nexus:

- Substituir ClickUp por CRM nativo: `Lead`, `Opportunity`, `Activity`, `Conversation`.
- Substituir Supabase por Prisma/Postgres Nexus.
- Criar integracao opcional Twilio/UltraVox como canal `VOICE`.
- Salvar chamada e resumo em `Message`/`Activity`.
- Se call score indicar interesse, criar oportunidade e tarefa de follow-up.

Prioridade: media, depois do outbound WhatsApp.

### 6. I.A + Twilio + UltraVox

Resumo:

- Workflow pequeno com 5 nos.
- Webhook recebe chamada.
- Cria call UltraVox.
- Formata resposta.
- Responde ao webhook.

O que aproveitar:

- Esqueleto minimo para conectar Twilio com UltraVox.
- Bom prototipo para um endpoint Nexus `POST /api/voice/twilio/inbound`.

Como encaixar na Nexus:

- Usar como POC de voz, sem dependencias de CRM externo.
- Reaproveitar apenas o contrato: entrada Twilio, chamada UltraVox, resposta Twilio.

Prioridade: baixa/media.

### 7. Contactiva PRO - Versao 3.1

Resumo:

- Workflow com 61 nos.
- Tem webhook, validacao de licenca, Evolution API, envio de email, filtros, switches e agente IA.
- Agente principal reescreve mensagens mantendo sentido e formatacao do WhatsApp.
- Usa OpenAI `gpt-4.1-mini`.

Observacao tecnica:

- O JSON tem chaves duplicadas que quebram parser estrito, embora o Node consiga ler. Antes de importar em automacoes criticas, precisa normalizar/validar.

O que aproveitar:

- Reescrita de mensagem preservando sentido, intencao e formatacao.
- Validacao/licenciamento como padrao se a Nexus vender automacoes white-label.
- Fluxo de canais alternativos como email.

Como encaixar na Nexus:

- A Nexus ja tem um servico parecido em `backend/src/services/messageRewrite.ts`.
- Evoluir esse servico para suportar tom por campanha: direto, consultivo, educacional, reativacao.
- Adicionar auditoria: original, final, provider, modelo, aplicado ou nao.

Prioridade: media.

## Arquitetura alvo para prospeccao automatica Nexus

### Esteira principal

1. Usuario cria uma campanha de prospeccao:
   - nicho;
   - cidade/UF;
   - limite diario;
   - horario permitido;
   - oferta;
   - persona;
   - canal principal;
   - responsaveis/consultores;
   - criterios de qualidade.

2. Worker captura leads:
   - Serper/SerpAPI/Outscraper/Maps;
   - LinkedIn/SerpAPI para decisores;
   - futuras fontes: Instagram, listas importadas, paginas locais.

3. Nexus normaliza e deduplica:
   - telefone;
   - website;
   - endereco;
   - cidade/UF;
   - categoria;
   - provider/externalId;
   - `organizationId + phoneNormalized`.

4. Nexus enriquece:
   - CNPJ;
   - razao social/nome fantasia;
   - socios/administradores;
   - website;
   - sinais de presenca digital;
   - decisores;
   - score de oportunidade.

5. Gate de qualidade:
   - telefone valido;
   - sem opt-out;
   - sem lead duplicado recente;
   - CNPJ validado ou abordagem neutra;
   - score minimo;
   - limite por consultor/canal.

6. Matricula em funil:
   - cria `ProspectingRun`;
   - escolhe etapa inicial;
   - escolhe consultor;
   - gera primeira mensagem.

7. Dispatch controlado:
   - horario comercial;
   - aquecimento por numero;
   - limite diario;
   - delay randomizado;
   - fila persistente;
   - tentativa e backoff;
   - registro em `ProspectingDispatchAttempt`.

8. Conversa com IA:
   - recebe mensagens via WhatsApp;
   - agrupa mensagens por alguns segundos;
   - classifica intencao;
   - responde uma pergunta por vez;
   - salva dados coletados;
   - respeita opt-out;
   - passa para humano quando necessario.

9. Conversao:
   - cria/atualiza `Lead`;
   - cria `Opportunity`;
   - agenda reuniao em `CalendarEvent`;
   - cria tarefa para responsavel;
   - registra resumo no CRM.

10. Monitoramento:
   - leads capturados;
   - leads aprovados;
   - mensagens enviadas;
   - respostas;
   - interessados;
   - reunioes;
   - opt-outs;
   - falhas por canal;
   - saude de numero.

## Modelo de dados recomendado

Usar como fonte de verdade:

- `ProspectMission`: campanha/configuracao/scheduler.
- `LeadCaptureSource`: lote de captura.
- `CapturedLead`: lead bruto normalizado e enriquecido.
- `ProspectingDecisionMaker`: decisores.
- `ProspectingFunnel`: template de funil.
- `ProspectingRun`: estado do lead no funil.
- `ProspectingDispatchAttempt`: cada tentativa de envio.
- `ProspectingOptOutContact`: bloqueio por telefone.
- `Inbox`, `Channel`, `Conversation`, `Message`: conversas.
- `Lead`, `Opportunity`, `CalendarEvent`: CRM/conversao.

Evitar como fonte de verdade:

- `ProspectLead` legado.
- Google Sheets.
- Supabase externo.
- ClickUp.
- Memoria apenas em Redis.

## Componentes a implementar ou consolidar

### Backend

1. `ProspectingCampaignWorker`
   - Executa missoes/campanhas.
   - Cria `LeadCaptureSource`.
   - Chama `LeadCaptureService`.
   - Enfileira enriquecimento.

2. `LeadEnrichmentWorker`
   - Valida CNPJ.
   - Busca decisores.
   - Calcula score.
   - Define se lead esta pronto para outbound.

3. `OutboundQueueWorker`
   - Substitui dispatch manual.
   - Controla horario, limite, opt-out, numero e tentativas.
   - Usa `OutboundDispatcherService`.

4. `ConversationAIWorker`
   - Processa respostas recebidas.
   - Usa memoria do `Conversation`/`Message`.
   - Atualiza `ProspectingRun`.
   - Gera proxima resposta ou handoff.

5. `FollowUpWorker` especifico de prospeccao
   - Agenda follow-ups por `nextActionAt`.
   - Para quando houver resposta, opt-out, agendamento ou humano assumindo.

### Frontend

Criar uma tela unificada: `Maquina de Prospeccao`.

Abas sugeridas:

- Campanhas: criar/editar nicho, local, oferta, canal e limites.
- Leads capturados: lista, score, origem, CNPJ, decisores, status.
- Fila outbound: pronto, aguardando horario, enviado, falhou, opt-out.
- Conversas IA: abertas, aguardando lead, interessado, handoff.
- Agenda: reunioes geradas.
- Saude dos canais: instancias, limite diario, falhas, bloqueios.

## Fases de execucao

### Fase 1 - Consolidar captura e campanha

- Transformar `ProspectMission` em campanha operacional de captura.
- Padronizar saida sempre em `CapturedLead`.
- Reaproveitar o padrao do Google Maps Scraper para status/paginacao.
- Adicionar busca de decisores inspirada no fluxo LinkedIn.
- Tela deve permitir criar campanha e ver execucoes.

Resultado esperado:

- Nexus captura leads automaticamente por nicho/local e salva na base correta.

### Fase 2 - Outbound WhatsApp seguro

- Criar fila persistente de disparo.
- Usar limites por numero/consultor/campanha.
- Registrar tentativa antes/depois do envio.
- Usar primeira mensagem curta.
- Usar reescrita opcional com IA.
- Exibir fila no frontend.

Resultado esperado:

- Leads aprovados entram em fila e sao abordados com controle operacional.

### Fase 3 - SDR conversacional

- Implementar buffer de mensagens inspirado nos fluxos SDR/InstaFlow.
- Classificar intencao: sem interesse, curioso, interessado, pediu preco, quer agendar, opt-out.
- Perguntar uma coisa por vez.
- Salvar respostas estruturadas no run/CRM.
- Criar handoff para humano.

Resultado esperado:

- Nexus responde leads e qualifica sem perder historico.

### Fase 4 - Conversao em CRM e agenda

- Criar/atualizar lead oficial no CRM.
- Criar oportunidade.
- Agendar reuniao.
- Gerar resumo de atendimento.
- Criar tarefa para consultor.

Resultado esperado:

- A prospeccao termina em oportunidade/reuniao, nao em conversa solta.

### Fase 5 - Canais adicionais

- Instagram Direct/comentarios inspirado no InstaFlow.
- Voz inbound com Twilio/UltraVox.
- Email quando fizer sentido.
- Webhooks externos para importar listas.

Resultado esperado:

- Nexus vira uma central multicanal, mantendo WhatsApp como primeiro canal de execucao.

## Decisoes recomendadas

- N8n deve ser referencia/importador, nao motor principal da Nexus.
- O core precisa ficar no backend Nexus para multi-tenant, auditoria, permissoes e UI.
- WhatsApp deve ser tratado com limites conservadores e opt-out forte.
- Captura automatica deve priorizar qualidade e reunioes, nao volume.
- CRM nativo deve substituir ClickUp/Supabase/Sheets em producao.
- Redis pode ser usado como buffer, mas todo evento relevante precisa persistir no Postgres.
- Instagram e voz devem entrar depois de estabilizar WhatsApp outbound.

## Backlog priorizado

P0:

- Unificar `ProspectMission` -> `LeadCaptureSource` -> `CapturedLead` -> `ProspectingRun`.
- Criar fila persistente para outbound.
- Garantir dedupe por telefone normalizado.
- Criar painel de fila outbound.
- Registrar todas as tentativas de envio.

P1:

- Buffer de mensagens recebidas.
- SDR IA com perguntas uma por vez.
- Persistencia de respostas qualificadoras.
- Handoff humano.
- Follow-up automatico por `nextActionAt`.

P2:

- Pesquisa LinkedIn/decisores com score.
- Parser para dividir mensagens longas.
- Reescrita por tom de campanha.
- Dashboard de metricas.

P3:

- Instagram Direct/comentarios.
- Twilio/UltraVox inbound.
- Email outbound/inbound.
- Importador de workflows n8n como templates.

## Riscos

- WhatsMeow e canal nao oficial; exige aquecimento, limites e plano B para WhatsApp Cloud API.
- SerpAPI/Serper/Outscraper tem custo e variacao de qualidade por nicho.
- LinkedIn via busca externa pode gerar falso positivo de decisor.
- IA pode prometer demais se prompts nao forem presos a oferta/campanha.
- Automacao sem opt-out e auditoria pode gerar risco comercial e reputacional.
- Workers em memoria podem duplicar execucoes se houver mais de uma replica.

## Proximo passo recomendado

Implementar a Fase 1 e Fase 2 como MVP:

1. Campanha automatica por nicho/cidade.
2. Captura real em `CapturedLead`.
3. Enriquecimento minimo.
4. Score e gate de qualidade.
5. Matricula em funil.
6. Fila outbound persistente.
7. Disparo WhatsApp com limites.
8. Painel operacional no frontend.

Depois disso, evoluir a conversa IA e follow-up. Essa ordem reduz risco porque primeiro garante fonte de lead, controle de envio e observabilidade.
