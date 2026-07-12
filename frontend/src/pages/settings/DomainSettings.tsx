import { useState, useEffect } from "react";
import {
  Globe,
  Plus,
  AlertCircle,
  CheckCircle,
  Copy,
  Loader2,
  X,
  RefreshCw,
  Server,
  ShieldCheck,
  ExternalLink,
  Link2,
  ArrowRight,
  Info,
  Check,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

interface DomainDns {
  type: string;
  host: string;
  value: string;
  cname?: {
    type: string;
    host: string;
    value: string;
  };
  www: {
    type: string;
    host: string;
    value: string;
  };
  internalUrl?: {
    slug: string;
    primary: string;
    legacy: string;
  } | null;
}

interface Domain {
  id: string;
  name: string;
  provider: string;
  status: string;
  dns?: DomainDns;
}

interface OrgInfo {
  name: string;
  slug: string;
  domain: string | null;
}

const emptyDomain = { name: "", provider: "docker" };

export default function DomainSettings() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState(emptyDomain);
  const [isSaving, setIsSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const panelHost = (() => {
    const panelUrl = import.meta.env.VITE_PANEL_URL || "https://nexus360.consultio.com.br";
    try {
      return new URL(panelUrl).hostname;
    } catch {
      return String(panelUrl).replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  })();

  const fetchData = async () => {
    try {
      const [domainsRes, orgRes] = await Promise.all([
        apiFetch("/api/domains"),
        apiFetch("/api/org/profile"),
      ]);
      if (domainsRes.ok) setDomains(await domainsRes.json());
      if (orgRes.ok) {
        const data = await orgRes.json();
        setOrgInfo({ name: data.name || data.tradeName || "", slug: data.slug || "", domain: data.domain || null });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pathUrl = orgInfo?.slug ? `https://${panelHost}/${orgInfo.slug}` : null;
  const legacyPathUrl = orgInfo?.slug ? `https://${panelHost}/whitelabel/${orgInfo.slug}` : null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/domains", {
        method: "POST",
        body: JSON.stringify(newDomain),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar domínio.");

      setIsModalOpen(false);
      setNewDomain(emptyDomain);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Erro ao cadastrar domínio. Verifique os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async (domain: Domain) => {
    setVerifyingId(domain.id);
    try {
      const res = await apiFetch(`/api/domains/${domain.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível validar o DNS.");
      fetchData();
    } catch (error: any) {
      alert(error.message || "Não foi possível validar o DNS.");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domain: Domain) => {
    if (!confirm(`Remover o domínio ${domain.name}?`)) return;
    try {
      await apiFetch(`/api/domains/${domain.id}`, { method: "DELETE" });
      fetchData();
    } catch {
      alert("Não foi possível remover o domínio.");
    }
  };

  const copy = (value: string, field: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const activeDomain = domains.find(d => d.status === "verified");
  const pendingDomains = domains.filter(d => d.status !== "verified");

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-gray-950">Domínio Personalizado</h2>
        <p className="text-gray-500">
          Configure seu CRM para abrir no domínio do seu cliente, sem instalar nada.
        </p>
      </div>

      {/* Current URLs Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Link2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">URLs do seu Painel</h3>
              <p className="text-slate-400 text-xs">Seus clientes acessam o CRM por estas URLs</p>
            </div>
          </div>

          {/* Temporary URL */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL Temporária (padrão)</span>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <Globe size={16} className="text-slate-400 shrink-0" />
              <code className="text-sm text-blue-300 font-mono flex-1 truncate">
                {pathUrl || "Sem slug configurado"}
              </code>
              {pathUrl && (
                <button
                  onClick={() => copy(pathUrl, "temp-url")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  title="Copiar URL"
                >
                  {copiedField === "temp-url" ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400" />}
                </button>
              )}
            </div>
            {legacyPathUrl && (
              <p className="text-[11px] text-slate-500 font-mono">
                Alternativa: {legacyPathUrl}
              </p>
            )}
          </div>

          {/* Custom Domain */}
          {activeDomain && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={12} />
                Domínio Personalizado (ativo)
              </span>
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <code className="text-sm text-emerald-300 font-mono flex-1 truncate">
                  https://{activeDomain.name}
                </code>
                <button
                  onClick={() => copy(`https://${activeDomain.name}`, "custom-url")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  title="Copiar URL"
                >
                  {copiedField === "custom-url" ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400" />}
                </button>
              </div>
            </div>
          )}

          {/* Arrow showing the mapping */}
          {activeDomain && (
            <div className="flex items-center gap-3 text-xs text-slate-500 pl-4">
              <ArrowRight size={14} />
              <span>
                <code className="text-blue-400">{activeDomain.name}</code> redireciona automaticamente para o painel interno
              </span>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
        <div className="flex gap-4">
          <Server className="shrink-0 mt-0.5 text-blue-600" size={22} />
          <div className="space-y-3">
            <h3 className="font-bold text-blue-900">Como funciona</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p className="text-blue-800/80">Cadastre o domínio que o cliente vai usar (ex: <code className="font-bold">crm.cliente.com.br</code>)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p className="text-blue-800/80">O cliente cria um registro <code className="font-bold">A</code> apontando para o IP do servidor Portainer</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p className="text-blue-800/80">O sistema valida automaticamente e libera o CRM assim que o DNS propagar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registered domains list OR empty state */}
      {domains.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Globe className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-700 font-bold text-lg">Nenhum domínio personalizado</p>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            Seu CRM está acessível pela URL temporária. Cadastre um domínio personalizado para que seus clientes acessem o painel com a marca deles.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 bg-primary text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            Cadastrar Domínio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Domínios Cadastrados</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-600 transition-all shadow-md shadow-blue-100"
            >
              <Plus size={16} />
              Novo Domínio
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {domains.map(domain => (
              <div key={domain.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      domain.status === "verified" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {domain.status === "verified" ? <ShieldCheck size={24} /> : <Globe size={24} />}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-950">{domain.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {domain.status === "verified" ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <CheckCircle size={12} /> Verificado — Funcionando
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                            <AlertCircle size={12} /> Aguardando apontamento DNS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(domain)}
                      disabled={verifyingId === domain.id}
                      className="px-5 py-2.5 rounded-xl bg-gray-950 text-white text-xs font-bold hover:bg-black disabled:opacity-60 flex items-center gap-2 transition-all"
                    >
                      {verifyingId === domain.id ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                      Revalidar DNS
                    </button>
                    <button
                      onClick={() => handleDelete(domain)}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Remover domínio"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* DNS Instructions for pending domains */}
                {domain.status !== "verified" && domain.dns && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Info size={16} className="text-gray-500" />
                      <h4 className="font-bold text-gray-950">Configure no DNS do cliente</h4>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <DnsCard
                        label="Registro A principal"
                        type={domain.dns.type}
                        host={domain.dns.host}
                        value={domain.dns.value}
                        onCopy={copy}
                        copiedField={copiedField}
                      />
                      {domain.dns.cname && (
                        <DnsCard
                          label="Alternativa CNAME"
                          type={domain.dns.cname.type}
                          host={domain.dns.cname.host}
                          value={domain.dns.cname.value}
                          onCopy={copy}
                          copiedField={copiedField}
                        />
                      )}
                      <DnsCard
                        label="Registro www (opcional)"
                        type={domain.dns.www.type}
                        host={domain.dns.www.host}
                        value={domain.dns.www.value}
                        onCopy={copy}
                        copiedField={copiedField}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Após alterar o DNS, aguarde a propagação (5-30 min). O sistema revalida automaticamente; use <strong>Revalidar DNS</strong> se quiser conferir na hora.
                      O certificado HTTPS é gerado automaticamente pelo Traefik/Let's Encrypt.
                    </p>
                    {domain.dns.internalUrl && (
                      <p className="text-xs text-gray-500 font-mono">
                        URL interna: {domain.dns.internalUrl.primary} ou {domain.dns.internalUrl.legacy}
                      </p>
                    )}
                  </div>
                )}

                {/* Success message for verified domains */}
                {domain.status === "verified" && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-800">Domínio ativo e funcionando!</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Seus clientes já podem acessar o CRM em <code className="font-bold">https://{domain.name}</code>
                      </p>
                    </div>
                    <a
                      href={`https://${domain.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <ExternalLink size={16} className="text-emerald-600" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Domain Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-gray-950">Cadastrar Domínio</h2>
                <p className="text-sm text-gray-500 mt-1">Use o domínio completo do cliente.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Domínio personalizado</label>
                <input
                  required
                  type="text"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-mono"
                  placeholder="crm.cliente.com.br"
                  value={newDomain.name}
                  onChange={e => setNewDomain({ ...newDomain, name: e.target.value })}
                />
                <p className="text-xs text-gray-400">Ex: crm.minhaimobiliaria.com.br, painel.empresa.com</p>
              </div>

              {pathUrl && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mapeamento</span>
                  <div className="flex items-center gap-2 text-sm">
                    <code className="text-blue-600 font-bold">{newDomain.name || "dominio.com.br"}</code>
                    <ArrowRight size={14} className="text-gray-400" />
                    <code className="text-gray-600 text-xs truncate">{panelHost}/{orgInfo?.slug}</code>
                  </div>
                </div>
              )}

              <input type="hidden" value={newDomain.provider} />

              <div className="bg-amber-50 p-4 rounded-xl flex gap-3 border border-amber-100">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Apos cadastrar, o cliente precisa criar o registro DNS indicado na tela.
                  Isso nao compra nem transfere o dominio.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Globe size={20} />}
                Cadastrar Domínio
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DnsCard({
  label,
  type,
  host,
  value,
  onCopy,
  copiedField,
}: {
  label: string;
  type: string;
  host: string;
  value: string;
  onCopy: (value: string, field: string) => void;
  copiedField: string | null;
}) {
  const fieldKey = `dns-${type}-${host}`;
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-bold w-16">Tipo</span>
          <code className="font-bold text-gray-950 text-sm">{type}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-bold w-16">Host</span>
          <code className="font-bold text-gray-950 text-sm">{host}</code>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400 font-bold w-16 shrink-0">Valor</span>
          <button
            type="button"
            onClick={() => onCopy(value, fieldKey)}
            className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-left hover:bg-blue-100 transition-colors"
          >
            <code className="truncate font-bold text-primary text-sm">{value}</code>
            {copiedField === fieldKey ? (
              <Check size={14} className="shrink-0 text-emerald-600" />
            ) : (
              <Copy size={14} className="shrink-0 text-primary/60" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
