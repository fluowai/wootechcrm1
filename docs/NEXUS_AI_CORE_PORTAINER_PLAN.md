# Nexus AI Core no Docker/Portainer

Este plano transforma a IA do Nexus em uma camada central, auto-hospedada e evolutiva. O primeiro passo nao reescreve o backend atual: ele adiciona um adaptador para o Nexus consumir um gateway OpenAI-compatible local via LiteLLM.

## Objetivo

Criar uma central de IA para o Nexus com:

- API unica para chat e agentes;
- modelos locais via Ollama no MVP;
- gateway OpenAI-compatible via LiteLLM;
- base para RAG com Qdrant;
- armazenamento de documentos no MinIO;
- Redis para filas/cache em fases futuras;
- logs de uso no `AiLog` existente do Nexus.

## Arquitetura MVP

```text
Usuario / WhatsApp / Painel Nexus
        |
        v
Nexus API (/api/ai/core/chat)
        |
        v
LiteLLM (http://litellm:4000/v1)
        |
        v
Ollama (qwen-local, llama-local, gemma-local)

Servicos preparados:
Qdrant -> RAG e busca vetorial
MinIO  -> documentos, audios e imagens
Redis  -> filas, rate limit e jobs
Postgres ai-core -> historico interno do LiteLLM
```

## O que foi implementado

- `backend/src/services/aiCoreClient.ts`: cliente OpenAI-compatible para LiteLLM.
- `POST /api/ai/core/chat`: endpoint protegido para executar agentes via AI Core.
- `GET /api/ai/core/health`: health check dos modelos configurados no LiteLLM.
- `docker-stack.ai-core.yml`: stack Portainer separada para LiteLLM, Ollama, Qdrant, MinIO, Redis e Postgres.
- `litellm.config.yaml`: modelos locais iniciais.

## Variaveis no Portainer

Adicionar na stack principal do Nexus:

```env
AI_CORE_URL=http://litellm:4000/v1
AI_CORE_API_KEY=sua_chave_litellm
AI_CORE_DEFAULT_MODEL=qwen-local
LITELLM_MASTER_KEY=sua_chave_litellm
```

Adicionar na stack `docker-stack.ai-core.yml`:

```env
LITELLM_MASTER_KEY=sua_chave_litellm
AI_CORE_POSTGRES_PASSWORD=troque_esta_senha
AI_CORE_MINIO_ROOT_USER=nexusai
AI_CORE_MINIO_ROOT_PASSWORD=troque_esta_senha_com_32_chars
```

Use o mesmo valor em `AI_CORE_API_KEY` e `LITELLM_MASTER_KEY`.

## Ordem de implantacao no Portainer

1. Subir ou confirmar a stack principal do Nexus.
2. Criar a stack `Nexus AI Core` usando `docker-stack.ai-core.yml`.
3. Garantir que a stack AI Core use a mesma rede overlay do Nexus: `nexus360_nexus360_internal`.
4. Entrar no container `ollama` e baixar o primeiro modelo:

```bash
ollama pull qwen2.5:7b-instruct
```

5. Testar no painel/API:

```http
GET /api/ai/core/health
```

6. Testar chat:

```json
{
  "system": "nexus",
  "client_id": "cliente_123",
  "agent": "crm",
  "channel": "nexus",
  "message": "Crie um follow-up comercial curto para um lead morno.",
  "context": {
    "lead_name": "Joao",
    "pipeline_stage": "proposta_enviada"
  }
}
```

## Roadmap

### MVP

- LiteLLM + Ollama + endpoint `/api/ai/core/chat`.
- Logs em `AiLog`.
- Modelos locais pequenos/medios.
- Uso manual por rotas novas.

### V1

- Migrar rotas antigas de Gemini/Groq para o AI Core.
- Criar cadastro de modelos no painel.
- Criar cadastro de agentes com prompt, modelo, fallback e limite.
- Adicionar creditos por execucao.
- Implementar RAG com upload, chunking, embeddings e Qdrant.
- Conectar WhatsApp inbound ao agente de CRM/follow-up.

### V2

- vLLM com GPU NVIDIA.
- STT local com Faster Whisper.
- TTS com Piper/Kokoro.
- OCR com Tesseract/Docling.
- imagem com Flux/SDXL.
- roteamento por custo, latencia e qualidade.
- painel AI Admin completo.

## Decisoes tecnicas

- O Nexus continua em Express/Prisma/Vite no MVP para reduzir risco.
- LiteLLM fica como contrato OpenAI-compatible.
- Ollama e o primeiro runtime local, pela simplicidade operacional.
- Qdrant/MinIO/Redis sobem desde o inicio para evitar nova mudanca de stack quando RAG entrar.
- A central nao cria uma LLM por cliente: separa comportamento por agente e dados por tenant.
