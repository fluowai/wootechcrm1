import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  FileText, 
  Download,
  CreditCard,
  MessageSquare,
  LogOut,
  Target
} from 'lucide-react';

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'invoices'>('overview');

  // Mocks para demonstração do Portal
  const metrics = {
    leadsGenerated: 142,
    conversionRate: '12%',
    adsSpent: 'R$ 4.500,00',
    salesClosed: 17
  };

  const recentLeads = [
    { id: 1, name: 'João Silva', status: 'Em Contato', date: 'Hoje, 10:30' },
    { id: 2, name: 'Maria Santos', status: 'Reunião Agendada', date: 'Ontem, 15:45' },
    { id: 3, name: 'Empresa ABC', status: 'Venda Fechada', date: '02/05/2026' }
  ];

  const invoices = [
    { id: 'INV-001', amount: 'R$ 2.500,00', status: 'Atrasada', dueDate: '05/05/2026' },
    { id: 'INV-002', amount: 'R$ 2.500,00', status: 'Paga', dueDate: '05/04/2026' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Client Portal Header */}
      <header className="bg-slate-900 text-white p-6 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl">
            C
          </div>
          <div>
            <h1 className="text-xl font-black">Portal do Cliente</h1>
            <p className="text-sm text-gray-400 font-medium">Bem-vindo(a), Cliente VIP</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all">
          <LogOut size={16} /> Sair
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-8">
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <BarChart3 size={18} /> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'leads' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Users size={18} /> Meus Leads
          </button>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`pb-4 px-4 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <CreditCard size={18} /> Faturas
          </button>
        </div>

        {/* Tab Content */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900">Resultados da Agência</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-2">
                  <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Leads Gerados</span>
                  <span className="text-4xl font-black text-gray-900">{metrics.leadsGenerated}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-2">
                  <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Vendas Fechadas</span>
                  <span className="text-4xl font-black text-emerald-600">{metrics.salesClosed}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-2">
                  <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Investimento Ads</span>
                  <span className="text-3xl font-black text-gray-900">{metrics.adsSpent}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-2">
                  <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Conversão</span>
                  <span className="text-4xl font-black text-blue-600">{metrics.conversionRate}</span>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-8 flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">Resumo Estratégico do Mês</h3>
                  <p className="text-sm text-blue-800 leading-relaxed font-medium">
                    Neste mês focamos em campanhas de fundo de funil no Meta Ads, o que resultou em um aumento de 15% na taxa de conversão dos leads qualificados. Para a próxima semana, iniciaremos a otimização da Landing Page principal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-lg text-gray-900">Leads Recentes Recebidos</h3>
                <button className="flex items-center gap-2 text-sm font-bold text-primary hover:text-blue-700">
                  <Download size={16} /> Exportar CSV
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {recentLeads.map(lead => (
                  <div key={lead.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-900">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.date}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full ${
                      lead.status.includes('Fechada') ? 'bg-emerald-50 text-emerald-600' : 
                      lead.status.includes('Reunião') ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-lg text-gray-900">Faturas e Pagamentos</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Fatura {inv.id}</p>
                        <p className="text-sm text-gray-500">Vencimento: {inv.dueDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-black text-gray-900">{inv.amount}</p>
                      <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full ${
                        inv.status === 'Paga' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {inv.status}
                      </span>
                      {inv.status !== 'Paga' && (
                        <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all">
                          Pagar Agora
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Floating Action Button for Help/WhatsApp */}
      <button className="fixed bottom-6 right-6 p-4 bg-green-500 text-white rounded-full shadow-2xl hover:scale-110 transition-all z-50">
        <MessageSquare size={24} />
      </button>
    </div>
  );
}
