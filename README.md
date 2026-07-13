# WooTech CRM

Plataforma SaaS multi-tenant para CRM, prospecção, atendimento WhatsApp, automações, propostas, projetos, marketing e financeiro.

## Componentes

- `frontend`: React, TypeScript e Vite.
- `backend`: Express, TypeScript, Prisma e PostgreSQL.
- `worker`: processamento assíncrono separado da API.
- `whatsapp-bridge`: integração WhatsApp em Go.
- `integrations/google-maps-scraper`: serviço interno de prospecção.
- `redis`: cache e coordenação.

## Requisitos

- Node.js 20+
- npm 10+
- Go conforme `whatsapp-bridge/go.mod`
- PostgreSQL e Redis, ou Docker Compose

## Desenvolvimento local

1. Copie `.env.example` para `backend/.env` e preencha as credenciais.
2. Gere segredos fortes, por exemplo com `openssl rand -base64 48`. Nunca reutilize segredos entre ambientes.
3. Instale e prepare o backend:

   ```bash
   cd backend
   npm ci
   npm run prisma:generate
   npm run prisma:deploy
   npm run dev
   ```

4. Em outro terminal, inicie o frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Em desenvolvimento os workers são incorporados à API. Defina `RUN_BACKGROUND_WORKERS=false` para desligá-los e execute `npm run build && npm run start:worker` separadamente.

## Docker

O `docker-compose.yml` sobe API, worker, frontend, Redis, bridge WhatsApp e scraper. As variáveis `SEED_ADMIN_PASSWORD` e `WHATSAPP_BRIDGE_SECRET` são obrigatórias; o deploy falha cedo quando não são informadas.

```bash
docker compose up --build -d
docker compose ps
```

A API aplica `prisma migrate deploy` antes de iniciar. O seed só roda quando `RUN_SEED=true` e exige senha administrativa forte.

## Qualidade

```bash
npm test --prefix backend
npm test --prefix frontend
npm run lint --prefix backend
npm run lint --prefix frontend
npm run build --prefix backend
npm run build --prefix frontend
cd whatsapp-bridge && go test ./...
```

O workflow de CI executa testes, lint, builds e auditoria de dependências antes de publicar imagens. As imagens incluem SBOM e proveniência.

## Banco e migrações

Instalações novas usam a migration baseline em `backend/prisma/migrations`. Não use `prisma db push` em produção.

Para um banco existente criado antes do histórico de migrations:

1. Faça backup e valide restauração.
2. Confirme que o schema existente corresponde à baseline.
3. Marque a baseline como aplicada: `npx prisma migrate resolve --applied 20260713110000_baseline`.
4. Execute `npm run prisma:deploy`.

Valores financeiros usam `Decimal(18,2)`. A alteração deve ser validada em homologação antes da promoção do banco de produção.

## Segurança operacional

- Rotacione imediatamente qualquer credencial que já tenha sido publicada em arquivo, imagem ou histórico Git.
- Guarde segredos no cofre da plataforma/CI, nunca no repositório.
- Publique apenas frontend/API e o endpoint assinado necessário para mídia; mantenha Redis e scraper em rede interna.
- URLs de webhooks e varredura passam por validação contra SSRF, inclusive após redirects.
- Links públicos de propostas usam token aleatório e a aceitação é idempotente.
- Contas suspensas, trials expirados e assinaturas inadimplentes são bloqueados no backend.

Consulte [o relatório completo](RELATORIO_AUDITORIA_COMPLETA_2026-07-13.md) para riscos, prioridades e evolução recomendada.
