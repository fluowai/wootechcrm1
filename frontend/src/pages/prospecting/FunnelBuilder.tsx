import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Wand2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactPerson {
  id: string;
  name: string;
  role?: string;
  fallbackMessage?: string; // Mensagem se pessoa não estiver
}

interface FunnelStage {
  id: string;
  order: number;
  title: string;
  agentRole: string;
  maxMessages: number;
  scriptTemplate: string;
  conditions?: {
    requiresQualification?: boolean;
    transferToHuman?: boolean;
  };
}

interface ProspectingFunnel {
  id?: string;
  name: string;
  description: string;
  senderName: string; // "Paulo"
  senderCompany: string; // "TGA MKT"
  contactPeople: ContactPerson[]; // [Renata, Janete, etc]
  stages: FunnelStage[];
  createdAt?: Date;
}

export default function FunnelBuilder() {
  const [funnels, setFunnels] = useState<ProspectingFunnel[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [currentFunnel, setCurrentFunnel] = useState<ProspectingFunnel | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const defaultStages: FunnelStage[] = [
    {
      id: '1',
      order: 1,
      title: 'Primeiro Contato',
      agentRole: 'Agente de Abordagem',
      maxMessages: 2,
      scriptTemplate: 'Oi {contactName}, tudo bem? Aqui e o {senderName}. Consegue me ajudar a falar com a pessoa responsavel pelo comercial da empresa?',
      conditions: { requiresQualification: false }
    },
    {
      id: '2',
      order: 2,
      title: 'Qualificação',
      agentRole: 'Agente de Qualificação',
      maxMessages: 3,
      scriptTemplate: 'Perfeito. E voce que cuida dessa parte comercial ou tem outra pessoa que decide isso junto?',
      conditions: { requiresQualification: true }
    },
    {
      id: '3',
      order: 3,
      title: 'Diagnóstico',
      agentRole: 'Agente de Diagnóstico',
      maxMessages: 2,
      scriptTemplate: 'Pelo que voce comentou, talvez faca sentido olhar a estrutura comercial com mais calma. Voce toparia uma conversa rapida pra entender se tem oportunidade real de colocar mais dinheiro no caixa?',
      conditions: { transferToHuman: true }
    }
  ];

  const handleCreateFunnel = () => {
    const newFunnel: ProspectingFunnel = {
      name: 'Novo Funil',
      description: '',
      senderName: 'Paulo',
      senderCompany: 'Estrutura Comercial',
      contactPeople: [{ id: '1', name: 'Renata', role: '' }],
      stages: defaultStages,
      createdAt: new Date()
    };
    setCurrentFunnel(newFunnel);
    setIsCreating(true);
  };

  const handleSaveFunnel = () => {
    if (!currentFunnel) return;

    const updatedFunnels = funnels.filter(f => f.id !== currentFunnel.id);
    const funnelWithId = {
      ...currentFunnel,
      id: currentFunnel.id || `funnel_${Date.now()}`
    };

    setFunnels([...updatedFunnels, funnelWithId]);
    setIsCreating(false);
    setCurrentFunnel(null);
  };

  const handleAddContact = () => {
    if (!currentFunnel) return;
    const newContact: ContactPerson = {
      id: `contact_${Date.now()}`,
      name: '',
      role: ''
    };
    setCurrentFunnel({
      ...currentFunnel,
      contactPeople: [...currentFunnel.contactPeople, newContact]
    });
  };

  const handleRemoveContact = (contactId: string) => {
    if (!currentFunnel) return;
    setCurrentFunnel({
      ...currentFunnel,
      contactPeople: currentFunnel.contactPeople.filter(c => c.id !== contactId)
    });
  };

  const handleUpdateContact = (contactId: string, field: keyof ContactPerson, value: string) => {
    if (!currentFunnel) return;
    setCurrentFunnel({
      ...currentFunnel,
      contactPeople: currentFunnel.contactPeople.map(c =>
        c.id === contactId ? { ...c, [field]: value } : c
      )
    });
  };

  if (isCreating && currentFunnel) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Criar Novo Funil</h1>
          <button
            onClick={() => { setIsCreating(false); setCurrentFunnel(null); }}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        {/* Configuração Básica */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Funil</label>
            <input
              type="text"
              value={currentFunnel.name}
              onChange={(e) => setCurrentFunnel({ ...currentFunnel, name: e.target.value })}
              placeholder="Ex: Funil Farmácias"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
            <textarea
              value={currentFunnel.description}
              onChange={(e) => setCurrentFunnel({ ...currentFunnel, description: e.target.value })}
              placeholder="Descreva o objetivo deste funil..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none min-h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Seu Nome</label>
              <input
                type="text"
                value={currentFunnel.senderName}
                onChange={(e) => setCurrentFunnel({ ...currentFunnel, senderName: e.target.value })}
                placeholder="Paulo"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Sua Empresa (Sigla/Nome)</label>
              <input
                type="text"
                value={currentFunnel.senderCompany}
                onChange={(e) => setCurrentFunnel({ ...currentFunnel, senderCompany: e.target.value })}
                placeholder="Estrutura Comercial"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Contatos a Buscar */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">Pessoas de Contato</h2>
            <button
              onClick={handleAddContact}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {currentFunnel.contactPeople.map((contact, idx) => (
              <div key={contact.id} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => handleUpdateContact(contact.id, 'name', e.target.value)}
                    placeholder="Ex: Renata"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Cargo (opcional)</label>
                  <input
                    type="text"
                    value={contact.role || ''}
                    onChange={(e) => handleUpdateContact(contact.id, 'role', e.target.value)}
                    placeholder="Ex: Gerente de Vendas"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Se não estiver...</label>
                  <input
                    type="text"
                    value={contact.fallbackMessage || ''}
                    onChange={(e) => handleUpdateContact(contact.id, 'fallbackMessage', e.target.value)}
                    placeholder="Ex: Qual horário falo com ela?"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  onClick={() => handleRemoveContact(contact.id)}
                  className="p-2 hover:bg-red-50 text-red-500 rounded transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Estágios */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
          <h2 className="text-lg font-black text-gray-900">Estágios do Funil</h2>

          <div className="space-y-3">
            {currentFunnel.stages.map((stage) => (
              <div key={stage.id} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {stage.order}
                      </div>
                      <h3 className="font-bold text-gray-900">{stage.title}</h3>
                      <span className="text-xs font-bold text-gray-500">({stage.agentRole})</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{stage.scriptTemplate}</p>
                    <div className="text-xs text-gray-500">Até {stage.maxMessages} mensagens</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 pb-6">
          <button
            onClick={handleSaveFunnel}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg"
          >
            <Save size={18} />
            Salvar Funil
          </button>
          <button
            onClick={() => { setIsCreating(false); setCurrentFunnel(null); }}
            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Funis Personalizados</h1>
          <p className="text-gray-500 font-medium text-sm">Crie funis para localizar o responsavel comercial sem parecer robo.</p>
        </div>
        <button
          onClick={handleCreateFunnel}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg"
        >
          <Plus size={18} />
          Novo Funil
        </button>
      </div>

      {funnels.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
          <Wand2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum funil criado</h2>
          <p className="text-gray-500 mb-6">Crie seu primeiro funil personalizado para começar</p>
          <button
            onClick={handleCreateFunnel}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all"
          >
            Criar Primeiro Funil
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {funnels.map((funnel) => (
            <div
              key={funnel.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
            >
              <button
                onClick={() => setExpandedId(expandedId === funnel.id ? null : funnel.id)}
                className="w-full p-5 flex items-start justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-left">
                  <h3 className="font-black text-gray-900 text-lg">{funnel.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{funnel.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-bold text-gray-600">
                    <span>👤 {funnel.contactPeople.map(c => c.name).join(', ')}</span>
                    <span>📊 {funnel.stages.length} estágios</span>
                    <span>👤 {funnel.senderName} ({funnel.senderCompany})</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedId === funnel.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </button>

              <AnimatePresence>
                {expandedId === funnel.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 p-5 bg-gray-50 space-y-4"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Pessoas de Contato</h4>
                      <div className="space-y-1">
                        {funnel.contactPeople.map(contact => (
                          <div key={contact.id} className="text-sm text-gray-700">
                            <span className="font-bold">{contact.name}</span>
                            {contact.role && <span className="text-gray-500"> - {contact.role}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
