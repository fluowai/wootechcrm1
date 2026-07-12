import { useState, useEffect } from "react";
import { 
  Megaphone, 
  Plus, 
  RefreshCw, 
  Settings, 
  Trash2, 
  ExternalLink, 
  TrendingUp,
  DollarSign,
  Users,
  MousePointer,
  BarChart3,
  Pause,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { apiFetch } from "../../lib/api";

interface AdAccount {
  id: string;
  accountId: string;
  accountName: string;
  platform: string;
  accountStatus: string;
  accountCurrency?: string;
  dailySpendLimit: number;
  currentSpend: number;
  clientId?: string | null;
  client?: ClientSummary | null;
  lastSyncedAt?: string | null;
  syncStatus?: string;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  budgetType: string;
  budgetAmount: number;
  spendAmount: number;
}

interface ClientSummary {
  id: string;
  corporateName: string;
  tradeName?: string | null;
}

const platformIcons: Record<string, string> = {
  meta: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
  google: "https://www.gstatic.com/images/branding/product/2x/ads_48dp.png",
  linkedin: "https://content.linkedin.com/content/brand/digxit/in/en-sa/cct/hunter/12/052/026/3f3/-2hR-20g.png",
  tiktok: "https://cdn-icons-png.flaticon.com/512/2116/2116052.png"
};

const platformColors: Record<string, string> = {
  meta: "bg-blue-600",
  google: "bg-red-500",
  linkedin: "bg-blue-700",
  tiktok: "bg-black"
};

export default function AdAccounts() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'accounts' | 'campaigns' | 'analytics'>('accounts');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reportLinks, setReportLinks] = useState<Record<string, string>>({});

  const orgId = localStorage.getItem('nexus_org_id');

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, campaignsRes, clientsRes] = await Promise.all([
        apiFetch(`/api/ads/ad-accounts`),
        apiFetch(`/api/ads/campaigns-ads`),
        apiFetch(`/api/clients`)
      ]);
      const accountsData = await accountsRes.json();
      const campaignsData = await campaignsRes.json();
      const clientsData = await clientsRes.json();
      setAccounts(accountsData);
      setCampaigns(campaignsData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleConnect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await apiFetch('/api/ads/ad-accounts', {
        method: 'POST',
        body: JSON.stringify({
          accountId: formData.get('accountId'),
          accountName: formData.get('accountName'),
          platform: formData.get('platform'),
          accessToken: formData.get('accessToken'),
          clientId: formData.get('clientId') || null
        })
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error connecting account:", error);
    }
  };

  const toggleAccountStatus = async (account: AdAccount) => {
    const newStatus = account.accountStatus === 'active' ? 'paused' : 'active';
    try {
      await apiFetch(`/api/ads/ad-accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus: newStatus })
      });
      fetchData();
    } catch (error) {
      console.error("Error toggling account:", error);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) return;
    try {
      await apiFetch(`/api/ads/ad-accounts/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const syncAccount = async (account: AdAccount) => {
    setBusyAction(`sync:${account.id}`);
    try {
      await apiFetch(`/api/ads/ad-accounts/${account.id}/sync`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error("Error syncing account:", error);
    } finally {
      setBusyAction(null);
    }
  };

  const analyzeClient = async (account: AdAccount) => {
    if (!account.clientId) {
      alert('Vincule esta conta a um cliente antes de analisar.');
      return;
    }
    setBusyAction(`analyze:${account.id}`);
    try {
      await apiFetch(`/api/ads/clients/${account.clientId}/analyze`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error("Error analyzing client ads:", error);
    } finally {
      setBusyAction(null);
    }
  };

  const createReportLink = async (account: AdAccount) => {
    if (!account.clientId) {
      alert('Vincule esta conta a um cliente antes de gerar o link.');
      return;
    }
    setBusyAction(`share:${account.id}`);
    try {
      const response = await apiFetch(`/api/ads/clients/${account.clientId}/share`, { method: 'POST' });
      const data = await response.json();
      const absoluteUrl = `${window.location.origin}${data.url}`;
      setReportLinks(prev => ({ ...prev, [account.clientId || account.id]: absoluteUrl }));
      await navigator.clipboard?.writeText(absoluteUrl).catch(() => undefined);
    } catch (error) {
      console.error("Error creating report link:", error);
    } finally {
      setBusyAction(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'disabled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await apiFetch(`/api/ads/campaigns-ads/${campaign.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (error) {
      console.error("Error toggling campaign:", error);
    }
  };

  const totalSpend = campaigns.reduce((sum, c) => sum + c.spendAmount, 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budgetAmount, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas de Anúncio</h1>
          <p className="text-gray-500 mt-1">Gerencie suas contas de anúncios vinculadas</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium"
        >
          <Plus size={18} />
          <span>Conectar Conta</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['accounts', 'campaigns', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab === 'accounts' ? 'Contas' : tab === 'campaigns' ? 'Campanhas' : 'Analytics'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Contas Conectadas</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Campanhas Ativas</p>
              <p className="text-2xl font-bold">{activeCampaigns}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Gasto</p>
              <p className="text-2xl font-bold">R$ {totalSpend.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Orçamento Total</p>
              <p className="text-2xl font-bold">R$ {totalBudget.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                <div className="h-20 bg-gray-100 rounded-xl mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))
          ) : accounts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma conta conectada</h3>
              <p className="text-gray-500 mb-4">Conecte sua primeira conta de anúncio para começar</p>
              <button 
                onClick={() => setShowModal(true)}
                className="text-primary hover:underline"
              >
                Conectar Conta
              </button>
            </div>
          ) : (
            accounts.map(account => (
              <div 
                key={account.id}
                className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer hover:shadow-md ${
                  selectedAccount === account.id ? 'ring-2 ring-primary border-primary' : 'border-gray-100'
                }`}
                onClick={() => setSelectedAccount(
                  selectedAccount === account.id ? null : account.id
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${platformColors[account.platform] || 'bg-gray-200'} rounded-xl flex items-center justify-center overflow-hidden`}>
                      {platformIcons[account.platform] ? (
                        <img src={platformIcons[account.platform]} alt={account.platform} className="w-8 h-8 object-contain invert" />
                      ) : (
                        <Megaphone className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
                      <p className="text-sm text-gray-500 capitalize">{account.platform}</p>
                      {account.client && (
                        <p className="text-xs text-gray-400">{account.client.tradeName || account.client.corporateName}</p>
                      )}
                    </div>
                  </div>
                  {getStatusIcon(account.accountStatus)}
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gasto Atual</span>
                    <span className="font-medium">R$ {account.currentSpend.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Limite Diário</span>
                    <span className="font-medium">R$ {account.dailySpendLimit.toLocaleString('pt-BR')}</span>
                  </div>
                  {account.accountCurrency && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Moeda</span>
                      <span className="font-medium">{account.accountCurrency}</span>
                    </div>
                  )}
                  {account.lastSyncedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Atualizado</span>
                      <span className="font-medium">{new Date(account.lastSyncedAt).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>
                
                {selectedAccount === account.id && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    {account.clientId && reportLinks[account.clientId] && (
                      <a
                        href={reportLinks[account.clientId]}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Link de resultados copiado
                        <ExternalLink size={15} />
                      </a>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); syncAccount(account); }}
                        disabled={busyAction === `sync:${account.id}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm disabled:opacity-60"
                      >
                        <RefreshCw size={16} className={busyAction === `sync:${account.id}` ? 'animate-spin' : ''} />
                        Sincronizar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); analyzeClient(account); }}
                        disabled={busyAction === `analyze:${account.id}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm disabled:opacity-60"
                      >
                        <TrendingUp size={16} />
                        Analisar IA
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); createReportLink(account); }}
                        disabled={busyAction === `share:${account.id}`}
                        className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors text-sm disabled:opacity-60"
                      >
                        <ExternalLink size={16} />
                        Gerar link individual
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAccountStatus(account); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
                      >
                        {account.accountStatus === 'active' ? <Pause size={16} /> : <Play size={16} />}
                        {account.accountStatus === 'active' ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
                      >
                        <Settings size={16} />
                        Configurar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAccount(account.id); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Campanha</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Plataforma</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Objetivo</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Orçamento</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Gasto</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma campanha encontrada
                    </td>
                  </tr>
                ) : (
                  campaigns.map(campaign => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${platformColors[campaign.platform] || 'bg-gray-200'} rounded-lg flex items-center justify-center overflow-hidden`}>
                            {platformIcons[campaign.platform] ? (
                              <img src={platformIcons[campaign.platform]} alt={campaign.platform} className="w-5 h-5 object-contain invert" />
                            ) : (
                              <Megaphone className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <span className="font-medium">{campaign.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize">{campaign.platform}</td>
                      <td className="px-6 py-4 capitalize">{campaign.objective}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : campaign.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.status === 'active' ? <CheckCircle size={12} /> : <Pause size={12} />}
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        R$ {campaign.budgetAmount.toLocaleString('pt-BR')}
                        <span className="text-gray-400 text-xs">/{campaign.budgetType}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">R$ {campaign.spendAmount.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCampaignStatus(campaign)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title={campaign.status === 'active' ? 'Pausar' : 'Ativar'}
                          >
                            {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Configurar"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Avançado</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Conecte suas contas de anúncio para visualizar métricas detalhadas, 
              Reports de performance e insights de otimização.
            </p>
          </div>
        </div>
      )}

      {/* Modal - Connect Account */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Conectar Conta de Anúncio</h2>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plataforma
                </label>
                <select 
                  name="platform" 
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione a plataforma</option>
                  <option value="meta">Meta (Facebook/Instagram)</option>
                  <option value="google">Google Ads</option>
                  <option value="linkedin">LinkedIn Ads</option>
                  <option value="tiktok">TikTok Ads</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Conta
                </label>
                <input 
                  type="text" 
                  name="accountName" 
                  required
                  placeholder="Ex: Minha Agência - Principal"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID da Conta
                </label>
                <input 
                  type="text" 
                  name="accountId" 
                  required
                  placeholder="Ex: act_123456789"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente vinculado
                </label>
                <select
                  name="clientId"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sem cliente vinculado</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.tradeName || client.corporateName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token (opcional)
                </label>
                <input 
                  type="password" 
                  name="accessToken" 
                  placeholder="Token de acesso API"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Necessário para conectar via API. Gere no Business Manager.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
