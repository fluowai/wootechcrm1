import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  CheckCircle, 
  Clock,
  AlertCircle,
  X,
  Download,
  Eye,
  Search,
  Calendar,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STATUS_COLORS = {
  pendente: "bg-yellow-100 text-yellow-700",
  paga: "bg-green-100 text-green-700",
  vencida: "bg-red-100 text-red-700",
  cancelada: "bg-gray-100 text-gray-500"
};

export default function Finance() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"receitas" | "despesas">("receitas");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"receita" | "despesa">("receita");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, expensesRes] = await Promise.all([
        apiFetch(`/api/finance/invoices`),
        apiFetch(`/api/finance/expenses`)
      ]);
      const [invoicesData, expensesData] = await Promise.all([
        invoicesRes.json(),
        expensesRes.json()
      ]);
      setInvoices(invoicesData);
      setExpenses(expensesData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalReceitas = invoices.filter(i => i.status === 'paga').reduce((sum, i) => sum + i.total, 0);
  const receitasPendentes = invoices.filter(i => i.status === 'pendente').reduce((sum, i) => sum + i.total, 0);
  const totalDespesas = expenses.filter(e => e.status === 'paga').reduce((sum, e) => sum + e.amount, 0);
  const despesasPendentes = expenses.filter(e => e.status === 'pendente').reduce((sum, e) => sum + e.amount, 0);
  const saldo = totalReceitas - totalDespesas;

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">Carregando financeiro...</div>;

  const data = tab === "receitas" ? invoices : expenses;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Financeiro</h1>
          <p className="text-gray-500">Controle completo de receitas e despesas.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setTab("receitas"); setModalType("receita"); setModalOpen(true); }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all font-medium shadow-lg shadow-green-200"
          >
            <Plus size={18} />
            <span>Nova Receita</span>
          </button>
          <button 
            onClick={() => { setTab("despesas"); setModalType("despesa"); setModalOpen(true); }}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all font-medium shadow-lg shadow-red-200"
          >
            <Plus size={18} />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={16} className="text-green-600" />
            <span className="text-xs font-semibold text-gray-500">Receitas Recebidas</span>
          </div>
          <p className="text-2xl font-bold text-green-600">R$ {totalReceitas.toLocaleString()}</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-600" />
            <span className="text-xs font-semibold text-gray-500">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">R$ {receitasPendentes.toLocaleString()}</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={16} className="text-red-600" />
            <span className="text-xs font-semibold text-gray-500">Despesas Pagas</span>
          </div>
          <p className="text-2xl font-bold text-red-600">R$ {totalDespesas.toLocaleString()}</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className={saldo >= 0 ? "text-blue-600" : "text-red-600"} />
            <span className="text-xs font-semibold text-gray-500">Saldo</span>
          </div>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>
            R$ {saldo.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab("receitas")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${tab === "receitas" ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <CreditCard size={16} className="inline mr-2" />
          Receitas ({invoices.length})
        </button>
        <button
          onClick={() => setTab("despesas")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${tab === "despesas" ? "bg-red-50 text-red-700" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Receipt size={16} className="inline mr-2" />
          Despesas ({expenses.length})
        </button>
      </div>

      {/* Lista */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Número</th>
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Cliente/Fornecedor</th>
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Descrição</th>
              <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Valor</th>
              <th className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Vencimento</th>
              <th className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Status</th>
              <th className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : data.map((item: any, i: number) => (
              <motion.tr 
                key={item.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-gray-50 hover:bg-gray-50/50"
              >
                <td className="p-4 font-mono text-sm text-gray-600">{item.invoiceNumber || item.id?.slice(0, 8)}</td>
                <td className="p-4 font-medium text-gray-900">{item.client?.corporateName || item.supplier || '-'}</td>
                <td className="p-4 text-gray-600">{item.description}</td>
                <td className="p-4 text-right font-bold text-gray-900">R$ {(item.total || item.amount).toLocaleString()}</td>
                <td className="p-4 text-center text-gray-600">
                  {new Date(item.dueDate || item.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {item.status !== 'paga' && item.status !== 'cancelada' && (
                    <button 
                      onClick={async () => {
                        const endpoint = tab === "receitas" ? "/api/finance/invoices" : "/api/finance/expenses";
                         await apiFetch(`${endpoint}/${item.id}`, {
                           method: 'PATCH',
                           body: JSON.stringify({ status: 'paga', paidAt: new Date().toISOString() })
                         });
                        fetchData();
                      }}
                      className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                      title="Marcar como pago"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <FinanceModal 
            type={modalType}
            onClose={() => setModalOpen(false)} 
            onSuccess={() => { setModalOpen(false); fetchData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FinanceModal({ type, onClose, onSuccess }: { type: "receita" | "despesa", onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: type === 'despesa' ? 'operacional' : '',
    clientId: '',
    supplier: '',
    document: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    tax: '0',
    isRecurring: false,
    recurringType: ''
  });
  const [clients, setClients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/api/clients')
      .then(res => res.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = type === 'receita' ? '/api/finance/invoices' : '/api/finance/expenses';
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        tax: parseFloat(formData.tax) || 0,
      };
      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
      >
        <div className={`p-8 border-b border-gray-100 flex justify-between items-center ${type === 'receita' ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{type === 'receita' ? 'Nova Receita' : 'Nova Despesa'}</h2>
            <p className="text-xs text-gray-500 mt-1">{type === 'receita' ? 'Cadastre uma nova fatura' : 'Cadastre uma nova despesa'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
              {type === 'receita' ? 'Cliente' : 'Fornecedor'}
            </label>
            <select 
              className="modal-input"
              value={type === 'receita' ? formData.clientId : formData.supplier}
              onChange={e => setFormData({...formData, [type === 'receita' ? 'clientId' : 'supplier']: e.target.value})}
              required
            >
              <option value="">Selecione...</option>
              {type === 'receita' ? clients.map(c => (
                <option key={c.id} value={c.id}>{c.corporateName}</option>
              )) : (
                <>
                  <option value="Infraestrutura">Infraestrutura</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Operacional">Operacional</option>
                </>
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Descrição</label>
            <input 
              className="modal-input"
              placeholder="Descrição do serviço/produto..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                {type === 'receita' ? 'Valor (R$)' : 'Valor (R$)'}
              </label>
              <input 
                type="number"
                className="modal-input"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                required
              />
            </div>
            {type === 'receita' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Impostos (R$)</label>
                <input 
                  type="number"
                  className="modal-input"
                  placeholder="0.00"
                  value={formData.tax}
                  onChange={e => setFormData({...formData, tax: e.target.value})}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                {type === 'receita' ? 'Vencimento' : 'Data'}
              </label>
              <input 
                type="date"
                className="modal-input"
                value={type === 'receita' ? formData.dueDate : formData.date}
                onChange={e => setFormData({...formData, [type === 'receita' ? 'dueDate' : 'date']: e.target.value})}
                required
              />
            </div>
            {type === 'despesa' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Categoria</label>
                <select 
                  className="modal-input"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="operacional">Operacional</option>
                  <option value="marketing">Marketing</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="infraestrutura">Infraestrutura</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              disabled={submitting}
              type="submit"
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                type === 'receita' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}