import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck, Trash2 } from "lucide-react";

const BASE_EMAIL = "privacidade@nexus360.consultio.com.br";

const content = {
  privacy: {
    title: "Politica de Privacidade",
    icon: ShieldCheck,
    updatedAt: "10 de junho de 2026",
    sections: [
      ["Quem somos", "O Nexus360 e uma plataforma SaaS para agencias acompanharem CRM, campanhas de marketing, leads, relatorios e operacoes comerciais de seus clientes."],
      ["Dados coletados", "Podemos processar dados de conta, identificadores de clientes, dados de campanhas, metricas de anuncios, leads, oportunidades, faturamento, usuarios e registros tecnicos de seguranca."],
      ["Google Ads e Meta Ads", "Quando uma conta de anuncios e conectada, usamos a autorizacao concedida para consultar contas, campanhas, grupos de anuncios, anuncios, criativos e metricas de performance necessarias para relatorios e recomendacoes operacionais."],
      ["Uso dos dados", "Usamos os dados para exibir dashboards, gerar relatorios por cliente, calcular indicadores, criar recomendacoes de melhoria e manter trilhas de auditoria e seguranca."],
      ["Compartilhamento", "Nao vendemos dados pessoais. Dados podem ser compartilhados com provedores de infraestrutura, banco de dados, hospedagem e APIs de IA somente quando necessario para operar o servico."],
      ["Retencao", "Mantemos os dados enquanto a conta estiver ativa ou pelo prazo necessario para cumprir obrigacoes legais, auditoria, seguranca e suporte."],
      ["Seguranca", "Aplicamos controle de acesso por organizacao, autenticacao, segregacao de dados por cliente e armazenamento protegido de credenciais sensiveis."],
      ["Direitos do titular", "Titulares podem solicitar acesso, correcao, exportacao, limitacao ou exclusao de dados conforme aplicavel pela LGPD e demais normas."],
      ["Contato", `Solicitacoes de privacidade podem ser enviadas para ${BASE_EMAIL}.`],
    ],
  },
  terms: {
    title: "Termos de Uso",
    icon: FileText,
    updatedAt: "10 de junho de 2026",
    sections: [
      ["Uso permitido", "O Nexus360 deve ser usado para gestao legitima de clientes, campanhas, leads, relatorios e operacoes comerciais da agencia."],
      ["Responsabilidade da agencia", "A agencia e responsavel por obter autorizacao de seus clientes para conectar contas Google Ads, Meta Ads e quaisquer outras fontes de dados."],
      ["Dados de plataformas externas", "Metricas de Google Ads e Meta Ads dependem de disponibilidade, permissoes, atrasos e limites das respectivas APIs."],
      ["Recomendacoes de IA", "As recomendacoes geradas por agentes sao apoio operacional. Decisoes finais sobre verba, criativos, pausas e alteracoes de campanha devem ser revisadas por um usuario autorizado."],
      ["Credenciais", "O usuario deve manter suas credenciais seguras e revogar acessos quando uma conta nao deve mais ser monitorada."],
      ["Suspensao", "Podemos restringir acesso em caso de uso abusivo, tentativa de violacao de seguranca, inadimplencia ou descumprimento destes termos."],
      ["Contato", `Duvidas sobre estes termos podem ser enviadas para ${BASE_EMAIL}.`],
    ],
  },
  "data-deletion": {
    title: "Exclusao de Dados",
    icon: Trash2,
    updatedAt: "10 de junho de 2026",
    sections: [
      ["Como solicitar", `Envie uma solicitacao para ${BASE_EMAIL} com o assunto "Exclusao de Dados Nexus360" e informe o email da conta, organizacao e cliente relacionado.`],
      ["Dados de Google/Meta", "Quando solicitado, removemos tokens, contas conectadas, snapshots de metricas, insights e recomendacoes associados ao cliente ou organizacao, respeitando obrigacoes legais e registros minimos de auditoria."],
      ["Revogacao nas plataformas", "O usuario tambem pode revogar o acesso diretamente nas configuracoes de seguranca da conta Google ou nas configuracoes de integracoes/apps da Meta."],
      ["Prazo operacional", "Solicitacoes verificadas serao processadas em prazo razoavel e confirmadas por email."],
      ["Limitacoes", "Backups e logs tecnicos podem permanecer por periodo limitado ate expirarem naturalmente, sempre com acesso restrito."],
    ],
  },
};

export default function LegalPage() {
  const { type = "privacy" } = useParams();
  const page = content[type as keyof typeof content] || content.privacy;
  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} />
            Nexus360
          </Link>
          <span className="text-sm text-gray-500">Atualizado em {page.updatedAt}</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <Icon size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Nexus360</p>
            <h1 className="text-3xl font-bold">{page.title}</h1>
          </div>
        </div>
        <div className="space-y-5">
          {page.sections.map(([title, body]) => (
            <section key={title} className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="mb-2 text-lg font-bold">{title}</h2>
              <p className="leading-7 text-gray-600">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
