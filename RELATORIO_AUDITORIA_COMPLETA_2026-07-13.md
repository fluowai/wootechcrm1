# Auditoria completa da plataforma WooTech CRM

**Data:** 13 de julho de 2026  
**Repositório analisado:** `C:\Users\paulo\wootechcrm1`  
**Branch:** `codex/crm-functional-fixes`  
**Commit de referência:** `07e5345`  
**Tipo de trabalho:** auditoria seguida de correções técnicas  

> **Atualização de execução — 13/07/2026:** os achados críticos e altos com correção direta no repositório foram tratados. Foram removidos segredos, mitigados SSRF e XSS, protegidas propostas e mídias públicas, reforçados conta/RBAC, criada a baseline de migrations, convertidos valores monetários para Decimal, separados workers, substituídos painéis simulados por dados reais, endurecidos containers/CI e ampliados os testes. Ações que dependem do ambiente externo — rotação efetiva de credenciais, backup/homologação da migration e deploy — continuam sendo procedimentos operacionais obrigatórios.

---

## 1. Resumo executivo

A WooTech CRM possui uma visão de produto ambiciosa e uma quantidade relevante de capacidades já representadas no código: CRM, leads, clientes, propostas, contratos, financeiro, projetos, tarefas, landing pages, qualificação, automações, IA, WhatsApp, Google Local, anúncios, portal do cliente, white label, billing e administração SaaS.

O principal problema não é falta de funcionalidades. É a distância entre **quantidade de módulos** e **profundidade de engenharia, segurança, teste e operação**. A plataforma atualmente se comporta como um produto beta de grande amplitude, com partes reais e partes simuladas convivendo na mesma interface. Ela ainda não oferece evidência suficiente para ser considerada pronta para escala, para dados sensíveis de muitos clientes ou para cobrança baseada em planos sem risco relevante.

### Diagnóstico geral

| Dimensão | Nota indicativa | Situação |
|---|---:|---|
| Visão e cobertura funcional | 8/10 | Muito ampla e comercialmente interessante |
| Arquitetura atual | 5/10 | Funciona como monólito modular, mas está excessivamente concentrada |
| Segurança | 3/10 | Há achados críticos e altos que exigem correção imediata |
| Isolamento multi-tenant | 5/10 | Há boas práticas locais, mas falta garantia central e uniforme |
| Qualidade e testes | 3/10 | Cobertura incompatível com 459 handlers e 166 modelos |
| Banco e governança de dados | 3/10 | Sem migrações, tipos monetários inadequados e schema muito amplo |
| Operação e observabilidade | 2/10 | Painéis simulados, CI sem gates e pouca evidência operacional real |
| UX e acessibilidade | 5/10 | Interface extensa e visualmente trabalhada, mas com ações inertes e baixa validação |
| Prontidão para escala | 3/10 | Não recomendada antes dos itens P0 e P1 |

### Conclusão executiva

**Recomendação:** interromper temporariamente a expansão de novos módulos e executar um ciclo de estabilização de 4 a 8 semanas. O foco deve ser segurança, isolamento, migrações, testes críticos, billing real, observabilidade e remoção clara de dados simulados.

Não recomendo ampliar a base de clientes ou armazenar mais dados sensíveis antes de concluir os itens P0 deste relatório. Também não recomendo vender como funcionalidades prontas os painéis de monitoramento, tickets e billing administrativo no estado atual.

---

## 2. Escopo e método

Foram analisados:

- frontend React/Vite/TypeScript;
- backend Express/TypeScript/Prisma;
- schema PostgreSQL;
- ponte WhatsApp em Go/whatsmeow;
- integrações e scraper Google Maps;
- autenticação, sessão, CORS, RBAC e multi-tenancy;
- propostas, contratos, webhooks, billing e portais públicos;
- Docker, Portainer, Nginx e GitHub Actions;
- testes, lint, build e dependências;
- UX visível, páginas simuladas, acessibilidade e desempenho;
- documentação e scripts operacionais.

### Limitações do teste

O backend completo não pôde ser iniciado localmente porque:

- `backend/.env` não existe;
- Docker não está instalado/disponível neste ambiente;
- não há PostgreSQL local configurado;
- não foram fornecidas credenciais de um ambiente de homologação.

Por segurança, os scripts antigos `test-api.ts`, `test-db.ts` e `test-script.ts` não foram executados, pois alteram dados, utilizam endpoints antigos e não fazem limpeza. Eles não são testes automatizados confiáveis.

O teste de navegador conseguiu servir o frontend local, mas o React não montou conteúdo no `#root` durante a janela observada. Isso foi registrado como achado; a causa exata exige reprodução em CI limpo ou ambiente homologado.

---

## 3. Inventário técnico

### Dimensão do sistema

| Área | Arquivos de código | Linhas aproximadas |
|---|---:|---:|
| Backend TypeScript | 148 | 33.128 |
| Frontend TypeScript/TSX | 118 | 37.274 |
| Ponte WhatsApp Go | 2 | 1.279 |
| Total principal | 268 | 71.681 |

Outros indicadores:

- **459 handlers** Express declarados nas rotas;
- **166 modelos Prisma**;
- **0 migrações Prisma versionadas**;
- schema Prisma com aproximadamente **3.386 linhas**;
- 10 arquivos de testes no backend;
- 1 arquivo de teste no frontend;
- 1 arquivo de teste na ponte Go;
- 9 arquivos diferentes de Compose/Stack na raiz, além de variações adicionais.

### Arquitetura observada

```text
Nginx / frontend React
        |
        v
API Express monolítica
  |-- autenticação e tenancy
  |-- ~459 handlers de domínio
  |-- workers iniciados no mesmo processo
  |-- Socket.IO / LiveKit
  |-- integrações de IA e scraping
  |
  +--> PostgreSQL via Prisma (166 modelos)
  +--> Redis/cache
  +--> MinIO/storage
  +--> WhatsApp bridge Go/whatsmeow
  +--> Google Maps scraper
  +--> provedores externos de IA, ads e billing
```

O desenho pode funcionar como monólito modular, mas atualmente as fronteiras de domínio, autorização, transações e observabilidade não são fortes o suficiente para a amplitude existente.

---

## 4. Resultado das verificações automatizadas

### Build

O primeiro build completo terminou com sucesso:

- Prisma Client gerado;
- TypeScript do backend compilado;
- TypeScript do frontend compilado;
- Vite gerou o bundle de produção;
- duração total observada: **166,5 segundos**.

O Vite alertou para chunks maiores que 500 KB:

- `MeetingRoom`: aproximadamente 636,63 KB, 174,07 KB gzip;
- chunk principal: aproximadamente 797,07 KB, 247,03 KB gzip.

Uma repetição isolada do build do frontend ficou sem concluir e precisou ser interrompida depois de uma janela prolongada. Portanto, o build passa, mas não apresentou reprodutibilidade satisfatória durante a auditoria.

### Testes do backend

Resultado:

- 101 testes passaram;
- 1 teste falhou;
- 1 suíte adicional não conseguiu carregar;
- comando terminou com código de falha.

Falhas:

1. `errorHandler.test.ts` não carrega por erro de importação do Prisma: `#main-entry-point` não definido.
2. `concurrency.test.ts` espera ordem determinística entre chaves independentes, embora a própria finalidade seja permitir paralelismo. O teste é flakey ou especifica comportamento incorreto.

### Testes do frontend

- 1 arquivo;
- 1 teste;
- 1 teste passou.

Um único teste para 37 mil linhas, dezenas de páginas e fluxos comerciais críticos equivale, na prática, a ausência de proteção contra regressão.

### Testes da ponte Go

- `go test ./...` passou.

O resultado é positivo, mas a cobertura ainda é pequena diante da responsabilidade da ponte: sessões, QR, mensagens, mídia, grupos, chamadas e persistência.

### Lint

| Componente | Resultado |
|---|---:|
| Backend | 865 problemas: 1 erro e 864 warnings |
| Frontend | 631 warnings |
| Total | 1.496 ocorrências |

A maior parte está relacionada a `any`, variáveis não usadas e baixa força de tipagem. Como o backend processa pagamentos, webhooks, tokens, dados multi-tenant e integrações externas, o uso amplo de `any` reduz de forma concreta a proteção oferecida pelo TypeScript.

### Dependências vulneráveis

`npm audit --omit=dev` encontrou:

| Componente | Alta | Moderada | Total |
|---|---:|---:|---:|
| Backend | 6 | 2 | 8 |
| Frontend | 2 | 0 | 2 |

Backend: vulnerabilidades em cadeias envolvendo `engine.io`, `express/qs`, `form-data`, `multer`, `socket.io-adapter`, `undici` e `ws`. Entre os riscos estão DoS, exaustão de memória, injeção de cabeçalhos, bypass de validação TLS e divulgação cruzada de informação.

Frontend: React Router vulnerável a DoS e potencial CSRF em certas requisições documentais PUT/PATCH/DELETE.

Todas as vulnerabilidades reportadas indicaram correção disponível.

---

## 5. Achados críticos e altos

### SEC-01 — Segredos reais ou reutilizáveis versionados

**Severidade:** crítica  
**Evidência:** arquivos de stack de produção rastreados pelo Git contêm o mesmo `JWT_SECRET`/`SUPABASE_JWT_SECRET` em texto claro. Há ainda defaults fracos para senha administrativa e segredo da ponte.

Arquivos afetados incluem:

- `docker-stack.portainer.corrigido.yml`;
- `docker-stack.production.yml`;
- `docker-stack.wootechcrm.yml`;
- `stack-corrigida.yml`;
- `docker-compose.yml`;
- seeds Prisma;
- `processar_cnpj_inteligente.py`.

**Impacto:** falsificação de tokens, acesso indevido, comprometimento entre ambientes e impossibilidade de confiar na revogação apenas removendo o valor do branch atual.

**Ações obrigatórias:**

1. Rotacionar imediatamente JWT, Supabase JWT, bridge secret, token CNPJ e senhas seed em todos os ambientes.
2. Revogar sessões e refresh tokens existentes após a rotação.
3. Remover valores do Git atual e, se o repositório foi compartilhado, reescrever o histórico com procedimento controlado.
4. Usar secrets do Portainer/GitHub/Vault, nunca valores default de produção.
5. Adicionar scanner de segredos no pre-commit e no CI.

### SEC-02 — Default secreto da ponte WhatsApp

**Severidade:** crítica quando a porta está publicada  
**Evidência:** backend e Go usam `dev-whatsapp-bridge-secret` se a variável não existir. O Compose publica a porta 8091 no host.

**Impacto:** um deployment incompleto pode permitir controle de sessões, envio de mensagens, conexão/desconexão e outras ações sensíveis.

**Ação:** falhar na inicialização quando o segredo estiver ausente ou fraco; remover publicação pública da porta; aceitar tráfego apenas na rede interna; usar comparação constante; rotacionar segredo.

### SEC-03 — SSRF em webhooks configuráveis

**Severidade:** alta  
**Evidência:** a validação aceita qualquer URL que comece com HTTP/HTTPS e o servidor executa `fetch(url)`.

**Impacto:** usuários autenticados podem induzir a API a acessar localhost, rede Docker, metadata cloud, painéis internos ou serviços protegidos por topologia de rede.

**Ações:** bloquear localhost, loopback, link-local, IPs privados e destinos resolvidos internamente; resolver DNS e validar antes de cada tentativa; bloquear redirects para redes privadas; preferir allowlist por organização; executar entregas em worker isolado com egress controlado.

### SEC-04 — SSRF no scanner de sites

**Severidade:** alta  
**Evidência:** `webScanner.ts` aceita website e usa Axios diretamente, além de encaminhar o destino ao serviço Jina.

**Impacto:** acesso a serviços internos e exfiltração indireta de respostas para dossiês e logs.

**Ação:** criar validador central de URL externa com as mesmas proteções do SEC-03.

### SEC-05 — XSS armazenado/refletido no fluxo de contratos

**Severidade:** alta  
**Evidência:** valores de cliente, template e `customData` são inseridos no HTML por substituição de string, sem escaping. O frontend renderiza o resultado com `dangerouslySetInnerHTML`.

**Impacto:** execução de JavaScript na sessão de operadores, roubo do access token armazenado em `sessionStorage`, ações em nome do usuário e comprometimento multi-tenant.

**Ações:** escapar todas as variáveis; usar um sanitizador HTML robusto com allowlist; impedir eventos, scripts, URLs perigosas, SVG ativo e CSS abusivo; adicionar testes de payload; preferir renderização estruturada em vez de HTML arbitrário.

### SEC-06 — Aceite público de proposta sem garantia forte e sem idempotência

**Severidade:** alta  
**Evidência:** `POST /api/public/proposals/:slug/accept` muda status e pode criar cliente a cada chamada, apenas com conhecimento do slug.

**Impacto:** aceite fraudulento, criação duplicada de clientes, automações repetidas e inconsistência comercial.

**Ações:** token público aleatório e separado do slug; expiração; registro de consentimento; idempotency key; transação única; condição `status != accepted`; auditoria de IP/user-agent; confirmação por e-mail quando apropriado.

### SEC-07 — Controle de plano, assinatura e RBAC aplicado principalmente na interface

**Severidade:** alta comercial e de autorização  
**Evidência:** `requireAccess` só foi encontrado efetivamente em rotas de snapshots. `PlanGuard` é usado em uma área do frontend. O middleware de permissão contém um comentário de lógica granular ainda não implementada.

**Impacto:** usuários podem chamar APIs diretamente mesmo quando a UI oculta um recurso; contas suspensas/past due podem continuar operando; limites de plano podem não ser cobrados; risco de receita e abuso de recursos de IA.

**Ações:** matriz backend por rota; assinatura ativa e limites aplicados no servidor; middleware central; testes por papel/plano/status; contadores atômicos de uso.

### SEC-08 — Arquivos de mídia do WhatsApp públicos

**Severidade:** alta para privacidade  
**Evidência:** `/media/` ignora autenticação na ponte. Os nomes são hashes difíceis de adivinhar, mas quem recebe ou descobre a URL acessa o arquivo sem expiração.

**Impacto:** vazamento de documentos, áudios, imagens e dados pessoais; retenção indefinida; problemas LGPD.

**Ações:** URLs assinadas e curtas; autenticação por tenant; expiração e limpeza; criptografia em repouso; antivírus e limite de tamanho; não publicar a ponte diretamente.

### DEP-01 — Dependências com vulnerabilidades altas

**Severidade:** alta  
**Ação:** aplicar atualizações compatíveis imediatamente, executar testes, travar CI com `npm audit` em alta/crítica e adicionar Renovate/Dependabot.

---

## 6. Multi-tenancy e autorização

### Pontos positivos

- existe `authenticateToken`;
- existe `resolveTenant`;
- várias rotas fazem `findFirst({ id, organizationId })` antes de atualizar/excluir;
- o host white label é comparado com a organização do token;
- super admin só pode trocar organização por header quando possui papel correspondente;
- refresh tokens são hasheados, persistidos e rotacionados;
- access token tem duração curta de 15 minutos.

### Riscos estruturais

O isolamento depende de cada handler lembrar de incluir `organizationId`. O middleware cria `tenantFilter`, mas o uso não é obrigatório. Em uma base com 459 handlers, revisão manual por rota não é garantia suficiente.

Foi observado o padrão “buscar com tenant e depois atualizar só por id”. Ele pode ser seguro dentro do handler atual, porém é frágil contra regressões e concorrência. Também há serviços internos que atualizam por `id` e dependem de um chamador ter validado previamente.

### Recomendação

Implementar uma camada de acesso a dados tenant-aware:

- repositórios por domínio ou extensão Prisma;
- funções `findTenantResource`, `updateTenantResource`, `deleteTenantResource`;
- `updateMany/deleteMany` com `{ id, organizationId }` quando não houver chave composta;
- chaves compostas `@@unique([id, organizationId])` onde aplicável;
- testes automáticos que tentam acessar o recurso de outra organização em toda rota crítica;
- proibir Prisma direto nas rotas gradualmente por regra arquitetural.

---

## 7. Banco de dados e integridade

### DB-01 — Nenhuma migração versionada

Com 166 modelos, a ausência de `backend/prisma/migrations` é um risco severo. `prisma db push` não substitui histórico de migração para produção.

**Riscos:** ambientes divergentes, alterações destrutivas, rollback impossível, deploy não auditável e perda de dados.

**Ação:** criar baseline do banco atual; adotar `prisma migrate deploy`; testar migrações em cópia sanitizada; documentar rollback e backup.

### DB-02 — Dinheiro armazenado em `Float`

Foram encontrados valores monetários como preço, amount, value, budget, subtotal, tax e total usando `Float`.

**Risco:** erros binários de arredondamento em faturamento, propostas, comissões e relatórios.

**Ação:** migrar para `Decimal` com precisão explícita, por exemplo `Decimal @db.Decimal(18,2)`, ou centavos inteiros. Centralizar regras de arredondamento.

### DB-03 — Estados de negócio como strings livres

O schema não possui enums Prisma e utiliza muitos comentários para descrever valores aceitos.

**Risco:** `PAID`, `paid`, `Pago` e variações podem coexistir; relatórios e automações quebram silenciosamente.

**Ação:** adotar enums ou tabelas de referência; validar entrada com schemas; criar constraints no PostgreSQL.

### DB-04 — Schema excessivamente concentrado

166 modelos em um arquivo único dificultam ownership, revisão e migração.

**Ação:** organizar por domínios com multi-file schema do Prisma ou geração controlada; definir responsáveis e diagramas de relações críticas.

### DB-05 — Ausência de evidência de política de backup/restore

Há documentação de deploy, mas não uma rotina comprovada de backup, PITR e teste de restauração.

**Ação:** RPO/RTO explícitos, backup diário, PITR se suportado, restore mensal testado e runbook de desastre.

### DB-06 — Seeds divergentes e perigosos

Existem `seed.ts` e `seed.js`; os scripts apontam para JS, enquanto parte do desenvolvimento parece usar TS. Há senha administrativa conhecida em seed.

**Ação:** manter uma única fonte, compilada no pipeline; seed idempotente; senha obrigatória por secret; bloquear seed em produção salvo flag explícita e auditada.

---

## 8. Arquitetura, confiabilidade e desempenho

### ARC-01 — API, agendadores e workers no mesmo processo

O servidor inicia MissionScheduler e vários workers: automação, follow-up, prospecção, SDR e smart follow-up.

**Riscos:**

- cada réplica da API pode iniciar os mesmos workers;
- jobs duplicados;
- falha de worker derruba ou degrada API;
- deploy interrompe tarefas;
- escalabilidade da API fica acoplada à carga dos agentes.

**Ação:** mover jobs para processos separados e fila durável; locking distribuído; idempotência; dead-letter queue; métricas por job.

### ARC-02 — Estado de reunião parcialmente em memória

LiveKit usa mapa em memória para reuniões agendadas, com fallback parcial no banco.

**Risco:** comportamento diferente entre réplicas, perda em restart e dificuldade de revogação.

**Ação:** persistir estado e códigos no banco/Redis com TTL e unicidade criptográfica.

### ARC-03 — Bundle grande

Dois chunks ultrapassam o limite recomendado. MeetingRoom/LiveKit é particularmente pesado.

**Ação:** lazy loading por rota; isolar LiveKit; manual chunks para vendor; medir LCP/INP; orçamento no CI.

### ARC-04 — Build lento e não determinístico

O build completo levou 166,5 s e uma repetição isolada ficou pendente.

**Ação:** medir `tsc --extendedDiagnostics`; limpar dependências duplicadas; cache de CI; separar typecheck e bundle; investigar imports circulares e consumo de memória.

### ARC-05 — Respostas e integrações sem resiliência uniforme

Existem timeouts pontuais, mas não uma política central de retry, circuit breaker, bulkhead e limites por provedor.

**Ação:** cliente HTTP comum; retry apenas para operações idempotentes; jitter; circuit breaker; métricas de custo e erro por organização/provedor.

### ARC-06 — Endpoint de health é insuficiente para operação

O health verifica banco, mas não diferencia liveness/readiness nem valida dependências essenciais.

**Ação:** `/health/live`, `/health/ready`; estado de DB, Redis, fila e storage; não incluir dependências opcionais na liveness.

---

## 9. CI/CD e infraestrutura

### OPS-01 — Pipeline publica imagens sem testar

O GitHub Actions faz build e push de quatro imagens, porém não executa lint, testes, auditoria, migração dry-run ou smoke test antes de publicar.

**Impacto:** código com testes falhando pode virar imagem `latest`.

**Ações:**

1. job obrigatório de install/typecheck/lint/test/audit;
2. banco efêmero e testes de integração;
3. build somente após gates;
4. scan de imagem com Trivy/Grype;
5. smoke test do container;
6. deploy por digest/SHA, não por `latest`;
7. ambientes staging e produção com aprovação.

### OPS-02 — SBOM e proveniência desativados

O workflow define `provenance: false` e `sbom: false`.

**Ação:** habilitar ambos e assinar imagens.

### OPS-03 — Containers rodam como root

Dockerfiles não definem usuário não privilegiado.

**Ação:** criar usuário, filesystem read-only quando possível, drop de capabilities, `no-new-privileges`, tmpfs e limites.

### OPS-04 — Serviços internos publicados no host

Ponte WhatsApp e scraper publicam portas. O backend também é publicado.

**Ação:** expor externamente apenas reverse proxy; manter serviços internos em rede privada; firewall e allowlist.

### OPS-05 — Muitos arquivos de stack concorrentes

Há diversas variantes “corrigida”, “production”, “pronta”, “sem llms” e “ai completo”. Isso aumenta muito o risco de implantar o arquivo errado ou uma configuração antiga com segredo fraco.

**Ação:** uma base oficial, overlays por ambiente e arquivos legados arquivados fora da raiz. Adicionar validação automatizada de Compose.

### OPS-06 — Binário de 29,58 MB versionado

`whatsapp-bridge.exe` está no Git.

**Ação:** remover do repositório e gerar em release/CI. Binários versionados dificultam revisão, aumentam clone e podem ficar divergentes do fonte.

### OPS-07 — Nginx e segurança web

Há bons headers básicos, mas faltam uma CSP adequada no frontend estático, Permissions-Policy e HSTS no ponto TLS.

**Ação:** CSP com nonces/hashes ou política compatível, `Permissions-Policy`, HSTS no proxy HTTPS e política de cache consistente.

---

## 10. Observabilidade e operação real

### OBS-01 — Painel de monitoramento é simulado

`AdminMonitor` gera latência com `Math.random()` e mostra uptime, storage, banco e incidentes com valores fixos.

**Impacto:** operadores podem acreditar que o sistema está saudável quando não há medição real. Esse é um risco operacional, não apenas visual.

**Ação:** substituir por Prometheus/OpenTelemetry/Grafana ou API de métricas real. Enquanto isso, marcar claramente “demonstração — dados simulados”.

### OBS-02 — Billing administrativo usa dados simulados

A página mostra faturas, receita e assinantes fixos, apesar de importar `apiFetch` sem utilizá-lo.

**Ação:** integrar ao backend ou ocultar/rotular como protótipo.

### OBS-03 — Tickets administrativos usam dados simulados

Tickets, contadores, categorias e SLA são fixos.

**Ação:** integrar aos modelos `SupportTicket` e trilha de mensagens/status; caso contrário, não apresentar como central global operacional.

### OBS-04 — Logs não estão totalmente padronizados

Há logger estruturado, mas ainda existem dezenas de `console.error/log/warn` no código.

**Ação:** correlação por request ID, org ID e user ID; redaction; níveis; exportação para backend central; alertas por SLO.

### Métricas mínimas recomendadas

- taxa de erro e latência p50/p95/p99 por rota;
- jobs pendentes, falhos, retries e idade da fila;
- conexão WhatsApp por organização;
- custo e latência de IA por provedor/org;
- leads capturados, deduplicados e convertidos;
- webhooks falhos e tempo desde última entrega;
- uso/limite por plano;
- autenticações falhas, bloqueios e refresh reuse;
- disponibilidade e saturação de DB/Redis/storage.

---

## 11. Produto, UX e completude funcional

### UX-01 — Navegação superior contém controles inertes

No shell principal:

- busca global não tem estado ou ação;
- sino não abre notificações;
- ajuda não executa ação;
- seletor de empresa e menu do usuário aparentam botões, mas não têm handler visível no trecho auditado.

**Impacto:** sensação de produto incompleto e quebra de confiança.

**Ação:** implementar, ocultar ou marcar como indisponível. Nunca manter controles que parecem funcionais sem feedback.

### UX-02 — Frontend local permaneceu vazio

O HTML, Vite e `main.tsx` responderam, mas o `#root` permaneceu sem filhos no teste. Não houve erro útil no console observado.

**Ação:** reproduzir em máquina/CI limpo; adicionar tela bootstrap/fallback; monitorar erro de import/mount; E2E deve garantir que login ou landing apareça em até alguns segundos.

### UX-03 — Acessibilidade insuficientemente tratada

Indicadores estáticos:

- 359 elementos `input`;
- 631 botões;
- apenas 8 ocorrências de `aria-label`;
- HTML principal com `lang="en"`, apesar de a aplicação ser em português.

Os números não provam todas as violações, mas indicam alto risco para botões somente com ícone, navegação por teclado e leitores de tela.

**Ações:** `lang="pt-BR"`; nomes acessíveis; labels associados; foco visível; modal focus trap; contraste; axe no CI; testes teclado/mobile.

### UX-04 — Dados simulados misturados a dados reais

Monitor, tickets, billing e partes analíticas apresentam valores plausíveis sem rótulo de simulação.

**Ação:** criar catálogo de módulos com estados `production`, `beta`, `prototype`, `disabled`. O frontend deve renderizar badge e o backend deve impedir uso de módulos não prontos.

### UX-05 — Amplitude prejudica clareza de proposta

O produto tenta ser CRM, ERP leve, marketing suite, automação, AI agents, WhatsApp, ads, landing builder, meeting e SaaS admin ao mesmo tempo.

**Ação estratégica:** escolher 3 fluxos centrais e torná-los excelentes:

1. aquisição/prospecção de lead;
2. CRM e fechamento;
3. onboarding/entrega e retenção.

Os demais módulos devem apoiar esses fluxos ou ficar explicitamente beta.

---

## 12. Documentação e manutenção

### DOC-01 — README não representa o sistema

O README ainda descreve um app do AI Studio, pede Gemini e diz `npm install`/`npm run dev`, sem explicar corretamente frontend, backend, DB, bridge, scraper, Redis, MinIO, migrações e seeds.

**Ação:** README de engenharia com arquitetura, pré-requisitos, comandos, variáveis, setup local, testes, migrações, troubleshooting e política de deploy.

### DOC-02 — Scripts de teste antigos e perigosos

Os scripts da raiz:

- chamam endpoints que não correspondem ao roteamento atual;
- criam dados diretamente;
- não autenticam adequadamente;
- não removem dados;
- imprimem “sistemas operacionais” após poucas operações.

**Ação:** remover ou mover para `scratch/legacy`; criar testes E2E idempotentes com banco descartável.

### DOC-03 — Relatórios anteriores podem ficar desatualizados

Já existem vários documentos de análise e roadmap. Sem data, commit e status de resolução, eles viram fontes conflitantes.

**Ação:** registrar ADRs e manter um único backlog de achados com status, owner, prazo e commit de correção.

---

## 13. Plano de ação priorizado

### P0 — Executar em 24 a 72 horas

| ID | Ação | Responsável sugerido | Esforço | Critério de aceite |
|---|---|---|---:|---|
| P0-01 | Rotacionar todos os segredos expostos | DevOps + backend | 1–2 d | Tokens antigos inválidos; secrets fora do Git |
| P0-02 | Remover defaults de senha/JWT/bridge | Backend + DevOps | 0,5 d | Processo falha sem secret forte |
| P0-03 | Corrigir 10 vulnerabilidades npm | Full-stack | 1–2 d | Audit sem alta/crítica; regressão verde |
| P0-04 | Bloquear SSRF em webhook e scanner | Backend/security | 2–3 d | Testes contra loopback, RFC1918, metadata e redirects |
| P0-05 | Corrigir XSS de contratos | Full-stack/security | 2–3 d | Payloads não executam; CSP e testes ativos |
| P0-06 | Tornar aceite de proposta idempotente e assinado | Backend | 2 d | Repetição não duplica; token expira e audita |
| P0-07 | Proteger mídia WhatsApp | Backend/Go | 2–4 d | URL expira; tenant validado; retenção definida |
| P0-08 | Criar gates mínimos no CI | DevOps | 1–2 d | Imagem não publica com teste/lint/audit falhando |
| P0-09 | Ocultar ou rotular painéis simulados | Frontend/product | 0,5–1 d | Nenhum dado fake apresentado como real |
| P0-10 | Fazer e testar backup antes de mudança de schema | DBA/DevOps | 1 d | Restore comprovado em ambiente isolado |

### P1 — Executar em até 2 semanas

| ID | Ação | Esforço | Critério de aceite |
|---|---|---:|---|
| P1-01 | Baseline e migrações Prisma | 3–5 d | `migrate deploy` reproduz staging |
| P1-02 | Enforcement central de tenant | 5–8 d | matriz cross-tenant automatizada verde |
| P1-03 | Enforcement backend de plano/RBAC/status | 5–8 d | APIs bloqueiam chamadas diretas sem direito |
| P1-04 | Migrar dinheiro para Decimal/centavos | 3–5 d | reconciliação sem diferença de arredondamento |
| P1-05 | Corrigir suíte backend e build determinístico | 2–4 d | 3 execuções CI consecutivas verdes |
| P1-06 | E2E dos fluxos críticos | 5–10 d | login→lead→deal→proposal→accept→client coberto |
| P1-07 | Rate limit distribuído | 2–4 d | múltiplas réplicas compartilham limites via Redis |
| P1-08 | Observabilidade real mínima | 5–8 d | dashboards usam métricas reais e alertas |
| P1-09 | Atualizar README/runbooks | 2–3 d | novo dev sobe ambiente por documentação |

### P2 — Executar em 30 a 60 dias

- separar workers da API;
- fila durável com retry, DLQ e idempotência;
- modularizar domínios e proibir acesso Prisma direto nas rotas novas;
- integrar billing e tickets reais;
- reduzir bundle e melhorar métricas web;
- elevar cobertura unitária e de integração;
- revisão LGPD completa: base legal, retenção, exportação e exclusão;
- hardening de containers e supply chain;
- SLOs e resposta a incidentes;
- testes de carga para CRM, WhatsApp, webhook e IA.

### P3 — Evolução estratégica de 60 a 120 dias

- telemetria de funil e valor por módulo;
- feature flags reais por organização;
- catálogo público de recursos estáveis/beta;
- onboarding orientado a resultado;
- governança de prompts e qualidade de IA;
- marketplace de integrações com contratos versionados;
- API pública com versionamento, scopes e quotas;
- auditoria externa de segurança antes de escala enterprise.

---

## 14. Estratégia de testes recomendada

### Pirâmide mínima

1. **Unitários:** validação, normalização, regras de status, dinheiro, quotas, sanitização e idempotência.
2. **Integração:** rotas + PostgreSQL/Redis reais em containers efêmeros.
3. **Contrato:** bridge, scraper, billing, LiveKit, IA e webhooks.
4. **E2E:** fluxos de usuário no navegador.
5. **Segurança:** cross-tenant, RBAC, SSRF, XSS, CSRF, upload, rate limit e secrets.
6. **Carga:** mensagens, captura de leads, kanban, relatórios e workers.

### Fluxos E2E obrigatórios

- cadastro, verificação, login, refresh e logout;
- suspensão da conta e expiração de plano;
- criação/edição/exclusão de lead;
- isolamento de lead entre duas organizações;
- oportunidade ganha/perdida;
- proposta criada, vista e aceita uma única vez;
- contrato gerado e assinado sem XSS;
- pagamento e reconciliação;
- WhatsApp conectar, enviar, receber, mídia e desconectar;
- opt-out e bloqueio de nova prospecção;
- landing page publicada e lead capturado;
- webhook válido, falha, retry e bloqueio de endereço interno;
- quota de IA e limite de plano;
- backup e restore de banco.

### Metas iniciais

- 100% dos P0 com teste de regressão;
- 100% das rotas críticas com teste cross-tenant;
- cobertura de branch acima de 70% em autenticação, billing, CRM e WhatsApp;
- E2E smoke abaixo de 10 minutos;
- CI total abaixo de 15 minutos;
- zero alta/crítica em dependências de produção.

---

## 15. Evolução da plataforma

### Direção recomendada de produto

A vantagem potencial da WooTech CRM é unir aquisição, venda e entrega para agências. A plataforma deve se posicionar menos como “todas as ferramentas” e mais como um **sistema operacional de receita para agências**, com três jornadas mensuráveis:

1. encontrar e qualificar oportunidades;
2. fechar com proposta, contrato e pagamento;
3. entregar, provar resultado e renovar.

### Evoluções de maior retorno

1. **Cockpit real de receita:** métricas do funil conectadas a dados, sem mocks.
2. **Automações confiáveis:** histórico, replay, idempotência e explicação do que a IA executou.
3. **Saúde do cliente:** sinais de churn baseados em entrega, comunicação, NPS e resultado.
4. **Governança de IA:** custo, quota, aprovação humana, versão de prompt e rastreabilidade.
5. **Onboarding por segmento:** templates e pipelines versionados, mensuração de time-to-value.
6. **Integrações profundas:** WhatsApp e ads como fluxos centrais, não apenas páginas independentes.
7. **Billing real:** planos, limites e cobrança controlados pelo backend.

### O que não fazer agora

- adicionar novos módulos grandes antes de estabilizar os existentes;
- criar mais arquivos de stack alternativos;
- confiar apenas em guards do frontend;
- usar `db push` como estratégia de produção;
- apresentar dados sintéticos como monitoramento;
- escalar réplicas da API mantendo todos os workers embutidos;
- armazenar novos dados financeiros em `Float`.

---

## 16. Critério de prontidão para produção

A plataforma só deve ser considerada pronta para escala quando todos os itens abaixo forem verdadeiros:

- nenhum segredo conhecido permanece válido;
- zero vulnerabilidade alta/crítica em runtime;
- CI bloqueia publicação quando testes falham;
- migrações versionadas e restore testado;
- isolamento cross-tenant automatizado;
- RBAC, plano e assinatura aplicados no backend;
- SSRF, XSS e mídia pública corrigidos;
- aceite de proposta idempotente;
- telas operacionais mostram dados reais ou são marcadas como demo;
- workers são idempotentes e não duplicam em múltiplas réplicas;
- observabilidade e alertas são reais;
- fluxos comerciais principais possuem E2E;
- runbook de incidente, backup e rollback está disponível.

---

## 17. Parecer final

A WooTech CRM tem base suficiente para se tornar uma plataforma valiosa, mas precisa trocar temporariamente velocidade de expansão por profundidade. O código demonstra várias decisões corretas — JWT curto, refresh token rotacionado e hasheado, Helmet, CORS controlado, verificações locais de tenant, paginação e separação parcial por serviços — porém essas práticas ainda não são uniformes.

O maior ganho agora virá de tornar confiáveis os fluxos que já existem. Se os P0 e P1 forem executados com disciplina, a plataforma pode sair de um beta amplo e frágil para um SaaS operável e vendável. Se novos módulos continuarem sendo adicionados antes dessa estabilização, o custo de correção e o risco de incidente crescerão mais rápido do que o valor entregue.

**Decisão recomendada:** iniciar imediatamente uma sprint de segurança P0, seguida por duas sprints de fundação P1, e só então retomar roadmap funcional.
