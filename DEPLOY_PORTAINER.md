# =============================================================================
# WooTech CRM - Guia de Deploy no Portainer
# Dominio: crm.wootech.com.br
# =============================================================================

## PRE-REQUISITOS

### 1. Servidor com Docker Swarm
```bash
# Iniciar Docker Swarm (se ainda nao iniciou)
docker swarm init --advertise-addr IP_DO_SERVIDOR

# Criar rede externa para o Traefik
docker network create --driver overlay woopanel1
```

### 2. Traefik v2+ rodando
O Traefik deve estar rodando na rede `woopanel1` com:
- Entrypoint `websecure` (porta 443)
- CertResolver `letsencryptresolver` configurado
- Docker provider habilitado

Exemplo basico de Traefik:
```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=woopanel1"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencryptresolver.acme.email=SEU_EMAIL"
      - "--certificatesresolvers.letsencryptresolver.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt
    networks:
      - woopanel1

networks:
  woopanel1:
    external: true

volumes:
  traefik_certs:
```

### 3. DNS configurado
```
crm.wootech.com.br  -->  A  -->  IP_DO_SERVIDOR
```

### 4. GHCR Images accessiveis
As imagens estao no GHCR (GitHub Container Registry):
- `ghcr.io/fluowai/wootech-crm-frontend:latest`
- `ghcr.io/fluowai/wootech-crm-api:latest`
- `ghcr.io/fluowai/wootech-crm-google-maps-scraper:latest`
- `ghcr.io/fluowai/wootech-crm-whatsapp-bridge:latest`

Se o repositorio for privado, faca login:
```bash
echo "GH_TOKEN" | docker login ghcr.io -u USUARIO --password-stdin
```

---

## DEPLOY VIA PORTAINER

### Passo 1: Acessar Portainer
Acesse `https://IP_DO_SERVIDOR:9000` e faca login.

### Passo 2: Criar a Stack
1. Navegue ate **Stacks** > **Add Stack**
2. Nome: `wootech-crm`
3. Build method: **Web editor**
4. Cole o conteudo de `docker-stack.portainer.yml`

### Passo 3: Configurar Environment Variables
Na aba **Environment Variables**, adicione cada variavel do `.env.portainer.example`:

**Variaveis OBRIGATORIAS** (preencha com valores reais):
```
DATABASE_URL=postgresql://postgres.xxx@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&statement_cache_size=0
DIRECT_URL=postgresql://postgres.xxx@db.xxx.supabase.co:5432/postgres?sslmode=require&schema=public
JWT_SECRET=<gera_um_string_aleatorio_64_chars>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<sua_chave_anon>
SUPABASE_SERVICE_ROLE_KEY=<sua_chave_service_role>
WHATSAPP_BRIDGE_SECRET=<gera_um_segredo_longo>
```

**Variaveis OPCIONAIS** (deixe vazio se nao usar):
```
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
... (veja .env.portainer.example para a lista completa)
```

### Passo 4: Deploy
1. Clique em **Deploy the stack**
2. Aguarde o pulling das imagens
3. Verifique os logs de cada servico

---

## VERIFICACAO POS-DEPLOY

### Health checks
```bash
# Status da stack
docker service ls | grep wootech

# Logs do API
docker service logs wootech-api --tail 50

# Logs do Frontend
docker service logs wootech-frontend --tail 50

# Testar API health
curl -k https://crm.wootech.com.br/api/health
```

### Servicos esperados
| Servico | Container | Porta |
|---------|-----------|-------|
| Frontend | wootech-frontend | 80 (via Traefik) |
| API | wootech-api | 10000 (via Traefik) |
| Worker | wootech-worker | - |
| Redis | wootech-redis | 6379 |
| Google Maps | wootech-gmaps-scraper | 8080 |
| WhatsApp Bridge | wootech-whatsapp-bridge | 8091 |
| LiteLLM | wootech-litellm | 4000 |

---

## TROUBLESHOOTING

### Imagem nao encontrada (404)
```bash
# Fazer login no GHCR
docker login ghcr.io -u USUARIO_GITHUB

# Ou puxar manualmente
docker pull ghcr.io/fluowai/wootech-crm-frontend:latest
docker pull ghcr.io/fluowai/wootech-crm-api:latest
```

### API nao conecta ao banco
- Verifique se `DATABASE_URL` e `DIRECT_URL` estao corretos
- O Supabase usa SSL: adicione `sslmode=require`
- Verifique se o IP do servidor esta whitelistado no Supabase

### Traefik nao roteia
- Verifique se a rede `woopanel1` existe: `docker network ls`
- Verifique se o Traefik tem o provider Docker habilitado
- Verifique os logs do Traefik para erros de certificado

### Erro de permissao no docker.sock
O API monta `/var/run/docker.sock:ro` para gerenciar white-label.
Se houver erro, verifique se o usuario do container tem acesso.

---

## ATUALIZACAO

### Atualizar uma imagem
```bash
# No Portainer: Stacks > wootech-crm > Repull image + restart

# Ou via CLI:
docker service update --image ghcr.io/fluowai/wootech-crm-api:latest wootech-api
```

### Atualizar o stack
1. Portainer > Stacks > wootech-crm
2. Edite o web editor com as mudancas
3. Clique em **Update the stack**

---

## BACKUP

### Backup dos volumes
```bash
# WhatsApp Bridge data
docker run --rm -v wootech_whatsapp_bridge_data:/data -v $(pwd):/backup alpine tar czf /backup/whatsapp-bridge-backup.tar.gz -C /data .

# Redis data
docker run --rm -v wootech_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Google Maps data
docker run --rm -v wootech_google_maps_scraper_data:/data -v $(pwd):/backup alpine tar czf /backup/gmaps-backup.tar.gz -C /data .
```
