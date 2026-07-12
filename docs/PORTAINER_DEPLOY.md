# Deploy do Nexus360 no Portainer

Esta stack segue o modelo recomendado para Swarm/Portainer: frontend com Nginx servindo apenas o SPA, API Node na porta `10000`, rede externa `consultio1` para o Traefik e rede overlay interna `nexus360_internal`.

O frontend nao usa `cat <<EOF` no comando da stack. Em alguns ambientes do Portainer esse heredoc e achatado em uma unica linha e o container do Nginx sai com exit code 1.

## Imagens

- `ghcr.io/fluowai/nexus360-frontend:latest`
- `ghcr.io/fluowai/nexus360-api:latest`

O workflow `.github/workflows/docker-images.yml` publica as imagens no GHCR quando ha push na branch `main`.

## Variaveis obrigatorias no Portainer

Configure estas variaveis em **Environment variables** da stack:

```env
DATABASE_URL=postgresql://postgres.projeto:senha@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:senha@db.projeto.supabase.co:5432/postgres?sslmode=require&schema=public
JWT_SECRET=troque_por_um_segredo_longo
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Se `DATABASE_URL`, `DIRECT_URL` ou `JWT_SECRET` aparecerem vazios nos detalhes do container da API, a API vai encerrar com exit code 1. A stack usa variaveis obrigatorias para impedir deploy sem esses valores.

Se o banco estiver vazio, rode `npx prisma db push --skip-generate` fora do boot da API e depois execute `node prisma/seed.js` uma vez. Nao deixe migracao/seed no comando principal da API em producao.

## Publicacao

- Site: `https://nexus360.consultio.com.br`
- API: `https://nexus360.consultio.com.br/api`
- Healthcheck: `https://nexus360.consultio.com.br/api/health`
- Landing pages publicas: `https://nexus360.consultio.com.br/lp/slug-da-landing`

## White-label e dominios customizados

Cada white-label tem uma URL interna por path no formato `nexus360.consultio.com.br/slug`, por exemplo `nexus360.consultio.com.br/tgamkt`. Essa URL nao exige DNS extra, pois usa o mesmo host principal publicado no Portainer.

DNS esperado:

- `crm.tgamkt.com` deve apontar com registro `A` para `207.58.153.219`.
- Opcionalmente, `www.crm.tgamkt.com` pode apontar com `CNAME` para `crm.tgamkt.com`.

O app identifica o tenant pelo host cadastrado em Admin > White-label e mantem o usuario no dominio personalizado. A URL `nexus360.consultio.com.br/tgamkt` continua disponivel como URL interna/alternativa.

As regras da stack mantem um `HostRegexp` global para roteamento generico, mas certificado HTTPS valido para dominios de clientes precisa de regra concreta `Host(...)`. O fluxo padrao usa o Docker API para adicionar essa regra diretamente ao servico `nexus360_frontend`:

1. O cliente aponta o dominio para `207.58.153.219`.
2. O admin cadastra/valida o dominio no front.
3. A API atualiza os labels Docker/Swarm do servico `nexus360_frontend` usando `/var/run/docker.sock`.
4. O Traefik, que ja le labels Docker, enxerga `Host(...)` com o dominio concreto e emite o certificado pelo `letsencryptresolver`.
5. O Nginx do frontend encaminha `/api`, `/lp` e `/socket.io` para a API; o restante serve o SPA.

A stack do Nexus monta `/var/run/docker.sock` na API. Isso da permissao alta ao container da API, mas evita editar a stack do Traefik a cada dominio. A API fica restrita a node `manager`, pois atualizacao de labels de servico no Swarm precisa do Docker API de um manager.

Depois de cadastrar ou validar um dominio, confira no retorno do front se aparece `Docker service nexus360_frontend atualizado`. Se aparecer erro de Docker socket, o Portainer/Swarm nao permitiu o bind `/var/run/docker.sock`.

### Alternativa com provider file do Traefik

Se houver acesso futuro a stack do Traefik, tambem e possivel usar provider file. Nesse modo, configure `TRAEFIK_SYNC_MODE=file` e habilite no Traefik:

```yaml
services:
  traefik:
    command:
      - "--providers.file.directory=/traefik/dynamic"
      - "--providers.file.watch=true"
    volumes:
      - traefik_dynamic:/traefik/dynamic

volumes:
  traefik_dynamic:
    name: traefik_dynamic
```

Se o Traefik ja tiver uma lista `command`, apenas adicione essas duas linhas `providers.file`. Se ele ja tiver `volumes`, apenas adicione o volume `traefik_dynamic`.

Em Swarm com mais de um node, a API e o Traefik precisam enxergar o mesmo volume. Em servidor unico, o volume local funciona. Em cluster multi-node, use volume compartilhado ou restrinja API e Traefik ao mesmo node.

Depois de aplicar o ajuste no Traefik, revalide o dominio no front ou chame `POST /api/admin/domains/sync-all` como super admin para regenerar os arquivos dinamicos dos dominios ja verificados.

## Observacoes

- Nao versione secrets reais no reposititorio.
- Para Docker/Swarm, prefira o pooler IPv4 no `DATABASE_URL`. O host direto do Supabase pode resolver apenas IPv6 em alguns projetos.
- O Traefik roteia `/api` e `/lp` para `nexus360_api`. O Nginx do frontend serve apenas o SPA e nao referencia o host interno `backend` para evitar falha no startup do container.
- Se o login retornar 500, veja os logs do servico `nexus360_api` no Portainer. Os erros de login normalmente aparecem como `[LOGIN_ERROR]` com `prismaCode`.
