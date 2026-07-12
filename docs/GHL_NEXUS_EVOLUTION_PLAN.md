# Plano de Evolucao Nexus360 inspirado na GoHighLevel

Data: 2026-06-27

## Leitura executiva

A GoHighLevel se posiciona como um sistema operacional de crescimento para agencias e negocios locais. O diferencial nao e uma funcionalidade isolada: e a unificacao de captura, relacionamento, fechamento, reputacao, reativacao, IA, cobranca e revenda por subconta.

A Nexus360 ja tem boa parte da base: CRM, pipelines, automacoes, WhatsApp, prospeccao, landing pages, quizzes, ads, whitelabel, planos, eventos de uso, logs de IA e uma stack AI Core com LiteLLM/Ollama/Qdrant/MinIO/Redis. O proximo salto e transformar essas pecas em uma experiencia de produto no estilo GHL: agencia controla subcontas, planos, limites, add-ons, modelos de IA e consumo; cliente usa ferramentas simples e integradas.

## O que a GHL tem como referencia

Principais blocos observados em materiais oficiais da HighLevel:

- Captura: CRM, Voice AI, forms, surveys, quizzes, websites, funnels, landing pages, chat widget, Conversation AI, call tracking, inbound SMS/social DMs, social planner, missed call text-back, prospecting tool e ad manager.
- Nutricao: caixa de conversas consolidada, SMS, Messenger, Instagram DM, WhatsApp, live chat, sales pipelines, workflows, automacoes, calendarios, lembretes, voicemail e app mobile.
- Fechamento: lead scoring, estimativas, propostas, invoicing, pagamentos, calendarios pagos, order forms, upsells, downsells, cursos/memberships, text-to-pay e tap-to-pay.
- Evangelizacao: reputation management, pedidos automaticos de review, affiliate/referral, review widgets, AI review reply, communities e loyalty.
- Reativacao: broadcasts por email/SMS/WhatsApp/Messenger, smart lists, segmentacao, campanhas de aniversario/sazonais, newsletters e Content AI.
- Modelo de monetizacao: planos por agencia, subcontas, wallet de uso, rebilling, add-ons revendiveis e AI Employee com pay-per-use, Growth e Unlimited por location.

## O que a Nexus ja tem

Base encontrada no repositorio:

- SaaS/whitelabel: `Agency`, `Organization`, `Plan`, `Feature`, `PlanFeature`, billing, dominios e portal do cliente.
- CRM/vendas: clientes, leads, oportunidades, pipelines, propostas, contratos, calendarios, tarefas e relatorios.
- Marketing: landing pages, landing editor, quizzes, asset library, ads, social/creative ops e guias de Google/Meta.
- Omnichannel/prospeccao: WhatsApp bridge, inboxes, prospeccao, funis, missoes, outbound e workers.
- IA atual: chaves Gemini/Groq por organizacao, `AiLog`, `UsageEvent`, AI settings, admin AI manager, prompts/agentes e rotas de IA.
- AI Core iniciado: `docker-stack.ai-core.yml` com LiteLLM, Ollama, Postgres, Redis, Qdrant e MinIO; modelos locais em `litellm.config.yaml`; endpoint `/api/ai/core/chat`; health em `/api/ai/core/health`.

## Gaps principais

1. Catalogo real de modelos e agentes no banco
   - Hoje os modelos locais existem no YAML do LiteLLM, mas nao como entidades gerenciaveis no painel.
   - Falta ativar/desativar modelo por agencia, plano, cliente e agente.

2. Controle de uso antes da chamada
   - Ha `UsageEvent` e `AiLog`, mas a checagem de limite ainda precisa acontecer antes de executar o modelo.
   - Falta bloqueio por tokens, requests, custo estimado, janela diaria/mensal e fair use.

3. Produto de IA revendivel
   - A GHL empacota IA como AI Employee com acesso por subconta, planos e rebilling.
   - A Nexus precisa de um "Nexus AI Employee" ou "Nexus AI Core" vendavel por cliente/subconta.

4. Roteamento por agente
   - Hoje existe chamada generica para o AI Core.
   - Falta configurar qual modelo cada agente usa: SDR, CRM, suporte, propostas, conteudo, diagnostico, WhatsApp, reviews etc.

5. Observabilidade operacional
   - Falta painel com saude dos containers, latencia por modelo, tokens, erros, custo interno, fila e uso por cliente.

6. Stack de IA multimodal completa
   - Texto local esta encaminhado com Ollama.
   - Falta STT local, TTS local, embeddings, RAG produtivo, OCR/documentos e imagem local/auto-hospedada.

## Arquitetura alvo para IA auto-hospedada

### Camada de gateway

- LiteLLM como API OpenAI-compatible unica.
- Banco do LiteLLM para chaves, logs e metricas internas.
- Nexus backend como policy engine: autentica tenant, decide modelo, aplica limite, chama LiteLLM e grava uso.

### Runtimes locais

MVP:
- Ollama: Qwen, Llama, Gemma e modelos pequenos/medios.
- Qdrant: vetores e RAG.
- MinIO: arquivos de conhecimento, audios, imagens e documentos.
- Redis: fila, cache, rate limit e lock.

V1 com GPU:
- vLLM: inferencia de alta performance para modelos maiores.
- TEI ou Ollama embeddings: embeddings locais.
- Faster Whisper: transcricao local.
- Piper ou Kokoro: TTS local.
- Docling/Tesseract: OCR e parsing de documentos.
- ComfyUI ou SDXL/Flux self-hosted: imagem.

### Modelos iniciais recomendados

- Geral/atendimento: `qwen2.5:7b-instruct` ou Qwen 2.5 14B se houver GPU.
- CRM/SDR em portugues: `llama3.1:8b` e Qwen como fallback.
- Conteudo/copy: `gemma2:9b` ou Qwen.
- Embeddings: `nomic-embed-text` ou `bge-m3`.
- STT: `faster-whisper-large-v3` ou `faster-whisper-medium`.
- TTS: Piper/Kokoro por voz configuravel.

## Implementacao proposta

### Fase 1 - Catalogo de IA e limites

Schema:
- `AiModel`: nome, provider, runtime, modelId LiteLLM/Ollama, contexto, custo interno, status, capabilities, health.
- `AiAgent`: nome, tipo, prompt, modelo padrao, fallback, temperatura, max tokens, ferramentas habilitadas.
- `AiEntitlement`: organizacao, cliente/subconta, plano, modelo/agente habilitado, limites.
- `AiUsageLedger`: requestId, org, user, client, agent, model, tokens in/out, credits, custo estimado, latencia, status.
- `AiQuotaWindow`: acumuladores diarios/mensais por org/client/agent/model.

Backend:
- `GET /api/ai/models`: listar modelos visiveis.
- `POST /api/ai/models/sync`: sincronizar modelos do LiteLLM/Ollama com banco.
- `PATCH /api/ai/models/:id`: ativar, desativar, definir visibilidade e custo.
- `GET /api/ai/agents`: listar agentes.
- `POST /api/ai/agents`: criar agente.
- `PATCH /api/ai/agents/:id`: configurar modelo, fallback e limites.
- `GET /api/ai/usage`: consumo por cliente/agente/modelo.
- `PATCH /api/ai/quotas/:scope`: alterar cotas.

UI:
- Evoluir `frontend/src/pages/admin/AIManager.tsx` para um painel real.
- Mostrar modelos locais, status, runtime, latencia, contexto, uso 24h/30d e disponibilidade.
- Adicionar tela de cotas por plano, cliente e agente.
- Adicionar tela de agentes com seletor de modelo, fallback e limites.

Regra critica:
- Toda chamada ao AI Core deve passar por `checkAiEntitlement()` antes de chamar LiteLLM.

### Fase 2 - Roteamento e migracao das rotas antigas

- Migrar `generate-content`, `agent`, `meeting-feedback` e rotas de servicos que usam Gemini/Groq para `runAiCoreChat`.
- Manter Gemini/Groq como providers externos opcionais dentro do LiteLLM, nao como chamadas diretas espalhadas.
- Criar fallback: local primeiro, externo se habilitado no plano e se houver chave.
- Gravar `AiUsageLedger` e `UsageEvent` em todas as execucoes.

### Fase 3 - Produto "Nexus AI Employee"

Planos:
- Pay-per-use: cobra por credito/token/execucao.
- Growth: franquia mensal por subconta.
- Unlimited: uso amplo com fair use, limites tecnicos e protecao anti-abuso.

Controles:
- Toggle por subconta: IA habilitada/desabilitada.
- Toggle por modulo: CRM, WhatsApp, Conteudo, Reviews, Voz, Propostas.
- Rebilling/markup: custo interno, preco ao cliente, margem e relatorio.
- Bloqueio automatico: excedeu cota, plano vencido, modelo indisponivel ou abuso.

### Fase 4 - RAG e conhecimento por cliente

- Upload de documentos para MinIO.
- Chunking e embeddings para Qdrant.
- `KnowledgeBase` conectada aos agentes.
- Limite por armazenamento, documentos, paginas indexadas e consultas RAG.
- Agentes de atendimento/WhatsApp usando conhecimento do cliente.

### Fase 5 - Voz, multimodal e automacoes estilo GHL

- STT local para reunioes e audios de WhatsApp.
- TTS local para Voice AI.
- Conversation AI com inbox consolidada.
- Reviews AI: resposta automatica e campanha de pedido de reviews.
- Workflow AI: acao de automacao que chama um agente/modelo com limite e log.
- Templates de automacao: reativacao, follow-up, missed call text-back, pos-venda e agenda.

## Prioridade de backlog

P0:
- Criar entidades `AiModel`, `AiAgent`, `AiEntitlement`, `AiUsageLedger`.
- Implementar guard de cota antes de `runAiCoreChat`.
- Fazer painel listar modelos reais do LiteLLM.
- Migrar chamadas diretas mais usadas para AI Core.

P1:
- Cotas por plano/subconta/agente.
- Relatorios de uso e custos.
- Fallback local/externo.
- Sincronizacao de modelos Ollama/LiteLLM.

P2:
- RAG com Qdrant/MinIO.
- Voice/STT/TTS self-hosted.
- Rebilling/markup completo.
- Workflow AI como acao de automacao.

## Criterios de aceite

- Admin ve todos os modelos auto-hospedados no painel, com status real.
- Admin define quais modelos/agentes cada plano e cliente pode usar.
- Cliente nao consegue consumir IA acima do limite configurado.
- Cada chamada de IA gera log de auditoria e evento de uso.
- O backend bloqueia antes da inferencia quando a cota acaba.
- Stack sobe no Portainer com LiteLLM, Ollama, Qdrant, MinIO, Redis e Postgres.
- Rotas antigas nao chamam Gemini/Groq diretamente sem passar pela politica central.

## Fontes GHL consultadas

- https://www.gohighlevel.com/
- https://help.gohighlevel.com/support/solutions/articles/155000003906-ai-employee-overview
- https://help.gohighlevel.com/support/solutions/articles/155000001156-highlevel-pricing-guide
