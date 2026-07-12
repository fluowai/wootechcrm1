# Prospeccao ativa com WhatsMeow

## Diagnostico do sistema atual

O Nexus360 ja possui uma base relevante para prospeccao ativa:

- Captura de leads em `backend/src/modules/lead-capture`, com provedores Serper, SerpAPI e Outscraper.
- Persistencia em `LeadCaptureSource` e `CapturedLead`.
- Enriquecimento de CNPJ em `LeadAiService.enrichLead`, com busca por CNPJ, consulta BrasilAPI/MinhaReceita/MUAC, score e auditoria em `CompanyIdentityCandidate` e `CompanyIdentityAuditLog`.
- Funil IA de prospeccao em `backend/src/routes/prospectingFunnels.ts`, com etapas, execucoes em `ProspectingRun` e primeira mensagem gerada a partir do decisor.
- Integracao WhatsMeow em `whatsapp-bridge/main.go`, com conexao, QR code, envio, recebimento, midia, grupos, participantes e webhook interno.
- Inbox omnichannel com `Inbox`, `Channel`, `Conversation` e `Message`.
- Tela WhatsApp em `frontend/src/pages/WhatsApp.tsx`, com abas de instancias, LLMs e mensagens diretas/grupos.

Principais lacunas encontradas:

- O telefone era normalizado apenas como `+5548...`, sem exibicao padronizada `+55 48 98800-3260`.
- JIDs e sufixos de aparelho podiam aparecer como fallback visual.
- Mentions de grupos eram armazenadas, mas nao havia funcao central para converter para nome/pushname/telefone exibivel.
- O envio de prospeccao nao gravava a mensagem de saida na conversa antes de haver resposta.
- A distribuicao entre consultores nao era aplicada no cadastro do lead/funil.
- Regras antispam estavam parcialmente declaradas no funil, mas o disparo nao bloqueava horario comercial ou limite diario.
- Alguns tipos de mensagem ainda dependem de expansao no bridge, principalmente contato, localizacao, reacao, edicao e mensagem apagada.

## Implementado nesta iteracao

- Normalizacao central de WhatsApp em `backend/src/utils/whatsapp.ts`:
  - remove caracteres invalidos;
  - remove sufixo de aparelho em JID, como `:15`;
  - garante DDI 55 quando a entrada tem DDD + numero;
  - devolve `digits`, `e164`, `jid`, `display`, `areaCode`, `subscriber` e `isValid`;
  - formata exibicao como `+55 48 98800-3260`;
  - filtra newsletters/broadcasts;
  - resolve mentions para `@Nome` ou `@+55 ...`.
- Rota WhatsApp agora grava metadados limpos:
  - `displayName`;
  - `displayPhone`;
  - `senderDisplayPhone`;
  - participantes com `displayName` e `displayPhone`;
  - mentions com label exibivel.
- Tela WhatsApp agora prioriza campos limpos e evita fallback visual para `contactId`/JID bruto.
- Funil de prospeccao agora:
  - usa primeira mensagem curta: `Oi, aqui e o Paulo da Consultio. Gostaria de falar com Renata.`;
  - tem `senderCompanyName` configuravel;
  - rotaciona leads entre usuarios ativos por departamento e limite diario;
  - salva `responsibleId` no `CapturedLead`.
- Disparo WhatsApp agora:
  - bloqueia fora do horario comercial;
  - respeita limite diario;
  - valida telefone antes de enviar;
  - grava a mensagem enviada em `Conversation`/`Message` para auditoria.
- Modelos Prisma adicionais:
  - `ProspectingDecisionMaker`;
  - `ProspectingDispatchAttempt`;
  - `ProspectingOptOutContact`;
  - `WhatsappContactIdentity`;
  - `WhatsappGroupParticipant`;
  - `WhatsappMention`;
  - `WhatsappConnectionLog`;
  - `WhatsappWebhookLog`.
- Endpoints adicionais:
  - `POST /api/lead-capture/leads/:id/validate-company`;
  - `GET /api/lead-capture/leads/:id/decision-makers`;
  - `POST /api/lead-capture/leads/:id/decision-makers/refresh`;
  - `GET /api/whatsapp/prospecting/dispatch-attempts`;
  - `GET /api/whatsapp/prospecting/opt-outs`;
  - `POST /api/whatsapp/prospecting/opt-outs`;
  - `GET /api/whatsapp/connections/:id/logs`.
- Bridge WhatsMeow agora preserva payload estruturado para:
  - contato;
  - localizacao;
  - reacao;
  - editada;
  - apagada;
  - protocolo/sistema.
- Frontend WhatsApp agora renderiza contato, localizacao, reacao, editada e apagada sem mostrar JSON cru.

Observacao operacional: os modelos Prisma foram adicionados ao schema. Em ambiente com banco real, aplicar `prisma migrate` ou `prisma db push` antes de usar os novos endpoints persistentes.

## Arquitetura alvo

Fluxo principal:

1. Capturar empresas via Google/Maps/base.
2. Normalizar telefone, cidade, UF, site e endereco.
3. Validar identidade empresarial antes de usar CNPJ/socios.
4. Enriquecer CNPJ, razao social, socios, contatos e fontes.
5. Escolher decisor com score.
6. Gerar primeira mensagem curta e humana.
7. Enfileirar em `ProspectingRun`.
8. Rotacionar consultor responsavel.
9. Disparar dentro de horario/limite.
10. Gravar mensagem enviada na conversa.
11. Receber resposta via WhatsMeow.
12. Tratar contato/grupo/midia/mentions.
13. Atualizar funil e encaminhar para humano quando houver abertura.

## Banco recomendado

O schema atual cobre boa parte:

- `CapturedLead`: empresa captada, telefone, Google, CNPJ validado, socios, status CRM.
- `CompanyIdentityCandidate`: candidatos de CNPJ e scores.
- `CompanyIdentityAuditLog`: auditoria de decisao de identidade.
- `ProspectingFunnel`, `ProspectingFunnelStage`, `ProspectingRun`: funil e execucao.
- `Inbox`, `Channel`, `Conversation`, `Message`: omnichannel WhatsApp.

Proximas tabelas recomendadas, quando for abrir migracao:

- `ProspectingDecisionMaker`: decisores com `name`, `role`, `source`, `confidenceScore`, `capturedLeadId`.
- `ProspectingDispatchAttempt`: tentativa de envio com `runId`, `channelId`, `consultantId`, `status`, `error`, `sentAt`.
- `WhatsappContactIdentity`: cache de `jid`, `phone`, `displayPhone`, `pushName`, `savedName`, `profilePictureUrl`.
- `WhatsappGroupParticipant`: participantes por grupo com JID bruto interno, telefone resolvido, pushname, foto e status admin.
- `WhatsappMention`: mensagem, JID mencionado, label resolvido e score de confianca.
- `OptOutContact`: opt-out por organizacao, telefone, origem e data.

Indices importantes:

- `CapturedLead(organizationId, phoneNormalized)`.
- `CapturedLead(organizationId, cnpjStatus)`.
- `ProspectingRun(organizationId, status, lastContactAt)`.
- `ProspectingRun(funnelId, capturedLeadId)`.
- `Conversation(channelId, contactId)`.
- `Message(conversationId, createdAt)`.

## Regras de CNPJ

Um CNPJ so deve ser aceito automaticamente quando:

- UF bate com o lead.
- Cidade bate com alta similaridade.
- Nome fantasia ou razao social tem similaridade suficiente.
- CNPJ tem digito verificador valido.
- Evidencia de busca menciona cidade/UF, quando disponivel.
- Score final >= 85.

Caso contrario:

- `cnpjStatus = needs_review`;
- nao usar socios como decisores;
- nao enviar ao CRM automaticamente;
- registrar motivo em auditoria.

## Regras de decisor

Prioridade:

1. Socio administrador.
2. Socio majoritario.
3. Responsavel legal.
4. Nome do site.
5. Nome do Google Business.
6. Nome de rede social.
7. Sem nome: abordagem neutra.

Mensagem com decisor:

```text
Oi, aqui e o Paulo da Consultio. Gostaria de falar com a Renata.
```

Mensagem sem decisor:

```text
Oi, aqui e o Paulo da Consultio. Gostaria de falar com o responsavel pela empresa.
```

## Regras WhatsApp

- Armazenar internamente JID quando necessario, mas nunca exibir JID bruto.
- Para contatos, exibir `savedName > pushName > leadName > displayPhone`.
- Para grupos, exibir nome do grupo, foto, participantes e remetente da mensagem.
- Para mentions, converter `@5548...@s.whatsapp.net` para `@Nome` ou `@+55 48 ...`.
- Ignorar newsletters, canais, status e broadcasts na listagem comum.
- Sempre separar numero interno (`5548988003260`) de exibicao (`+55 48 98800-3260`).

## Endpoints atuais e sugeridos

Atuais:

- `POST /api/lead-capture/search`
- `POST /api/lead-capture/leads/:id/enrich`
- `POST /api/lead-capture/leads/:id/research-management`
- `POST /api/prospecting-funnels/funnels/:id/enroll`
- `POST /api/whatsapp/prospecting/dispatch`
- `GET /api/whatsapp/connections`
- `POST /api/whatsapp/connections/:id/connect`
- `GET /api/whatsapp/conversations?kind=direct|groups`
- `GET /api/whatsapp/conversations/:id/messages`
- `POST /api/internal/whatsapp/events`

Sugeridos:

- `POST /api/lead-capture/leads/:id/validate-company`
- `POST /api/lead-capture/leads/:id/decision-makers`
- `POST /api/prospecting-runs/:id/dispatch-attempts`
- `GET /api/whatsapp/groups/:id/participants`
- `POST /api/whatsapp/contacts/:phone/opt-out`
- `GET /api/whatsapp/connections/:id/logs`

## Pseudocodigo

```ts
function validateCompanyMatch(lead, registry) {
  if (lead.state !== registry.state) reject("state_mismatch");
  if (similarity(lead.city, registry.city) < 0.9) reject("city_mismatch");
  if (maxSimilarity(lead.name, registry.tradeName, registry.legalName) < 0.72) reject("name_mismatch");
  return score >= 85 ? accept() : needsReview();
}
```

```ts
function pickDecisionMaker(lead) {
  return first([
    partnerWithRole("socio administrador"),
    majorityPartner(),
    legalResponsible(),
    siteContact(),
    googleBusinessContact(),
    socialContact(),
  ]);
}
```

```ts
function buildFirstMessage({ agentName, companyName, decisionMaker }) {
  if (decisionMaker) return `Oi, aqui e o ${agentName} da ${companyName}. Gostaria de falar com ${decisionMaker}.`;
  return `Oi, aqui e o ${agentName} da ${companyName}. Gostaria de falar com o responsavel pela empresa.`;
}
```

```ts
function dispatch(run) {
  assertBusinessHours();
  assertDailyLimit();
  assertValidPhone(run.leadPhone);
  assertNotOptOut(run.leadPhone);
  sendWhatsMeow(run.firstMessage);
  saveOutboundMessage();
  updateRun("sent");
}
```

## Checklist de testes

- Capturar lead com telefone em formatos diferentes e confirmar exibicao `+55 XX XXXXX-XXXX`.
- Capturar lead de cidade A e garantir que CNPJ de cidade B vira `needs_review`.
- Enriquecer CNPJ validado e gerar primeira mensagem com socio.
- Enviar lead sem CNPJ validado e confirmar abordagem neutra.
- Colocar varios leads no funil e verificar rotacao de `responsibleId`.
- Tentar disparo fora do horario comercial e confirmar bloqueio.
- Tentar disparo com telefone invalido e confirmar falha sem envio.
- Confirmar que mensagem enviada aparece na conversa antes da resposta.
- Receber mensagem direta e confirmar ausencia de JID bruto na tela.
- Receber grupo e confirmar nome do grupo, participante e telefone tratado.
- Receber mention e confirmar `@Nome` ou `@+55 ...`.
- Confirmar que newsletters/canais/broadcasts nao aparecem em mensagens.
- Receber imagem/audio/video/documento e verificar preview/arquivo.
- Simular opt-out e garantir parada do funil.
