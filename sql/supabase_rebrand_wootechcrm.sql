begin;

-- 1) Atualiza a organizacao principal e qualquer org ainda presa ao dominio antigo
update "Organization"
set
  name = case
    when lower(name) in ('nexus crm', 'nexus360', 'nexus360 crm') then 'WooTech CRM'
    else name
  end,
  domain = case
    when domain in ('nexus360.consultio.com.br', 'crm.wootech.com.br') then 'woocrm.wootech.com.br'
    else domain
  end,
  "whiteLabelConfig" = case
    when "whiteLabelConfig" is null then jsonb_build_object('name', 'WooTech CRM')
    when lower(coalesce("whiteLabelConfig"->>'name', '')) in ('', 'nexus crm', 'nexus360', 'nexus360 crm')
      then jsonb_set("whiteLabelConfig"::jsonb, '{name}', '"WooTech CRM"', true)
    else "whiteLabelConfig"::jsonb
  end,
  "updatedAt" = now()
where
  slug = 'nexus360-platform'
  or domain in ('nexus360.consultio.com.br', 'crm.wootech.com.br')
  or lower(name) in ('nexus crm', 'nexus360', 'nexus360 crm');

-- 2) Se existir dominio antigo cadastrado, renomeia para o novo quando nao houver conflito
update "Domain" d
set
  name = 'woocrm.wootech.com.br',
  provider = 'crm',
  "updatedAt" = now()
where d.name in ('nexus360.consultio.com.br', 'crm.wootech.com.br')
  and not exists (
    select 1
    from "Domain" nx
    where nx.name = 'woocrm.wootech.com.br'
      and nx."organizationId" = d."organizationId"
  );

-- 3) Se o novo dominio ja existir para a mesma org, remove o registro antigo duplicado
delete from "Domain" d
where d.name in ('nexus360.consultio.com.br', 'crm.wootech.com.br')
  and exists (
    select 1
    from "Domain" nx
    where nx.name = 'woocrm.wootech.com.br'
      and nx."organizationId" = d."organizationId"
  );

-- 4) Garante o dominio principal novo para a org principal, se ainda nao existir
insert into "Domain" ("id", "name", "provider", "status", "organizationId", "createdAt", "updatedAt")
select
  gen_random_uuid()::text,
  'woocrm.wootech.com.br',
  'crm',
  'verified',
  o.id,
  now(),
  now()
from "Organization" o
where o.slug = 'nexus360-platform'
  and not exists (
    select 1
    from "Domain" d
    where d.name = 'woocrm.wootech.com.br'
      and d."organizationId" = o.id
  );

-- 5) Atualiza landing pages que eventualmente apontem para o host antigo
update "LandingPage"
set
  domain = case
    when domain in ('nexus360.consultio.com.br', 'crm.wootech.com.br') then 'woocrm.wootech.com.br'
    else domain
  end,
  "customDomain" = case
    when "customDomain" in ('nexus360.consultio.com.br', 'crm.wootech.com.br') then 'woocrm.wootech.com.br'
    else "customDomain"
  end,
  "updatedAt" = now()
where domain in ('nexus360.consultio.com.br', 'crm.wootech.com.br')
   or "customDomain" in ('nexus360.consultio.com.br', 'crm.wootech.com.br');

commit;
