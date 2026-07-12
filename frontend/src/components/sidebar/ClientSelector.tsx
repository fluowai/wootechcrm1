import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { workspacePath } from '../../lib/workspaceRoute';

interface Client {
  id: string;
  corporateName: string;
  tradeName: string | null;
}

interface ClientSelectorProps {
  user: any;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  collapsed?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  user,
  selectedClientId, 
  onSelectClient,
  collapsed 
}) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const isSuperAdmin = user?.role === 'SUPER_ADMIN';
        const endpoint = isSuperAdmin ? '/api/admin/orgs' : '/api/clients';
        const response = await apiFetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Normalize data
            const normalized = data.map((item: any) => ({
              id: item.id,
              corporateName: isSuperAdmin ? item.name : item.corporateName,
              tradeName: isSuperAdmin ? null : item.tradeName
            }));
            setClients(normalized);
          } else {
            setClients([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch clients");
        setClients([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [user]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const canManageClients = ['SUPER_ADMIN', 'ORG_ADMIN', 'AGENCY_ADMIN'].includes(user?.role);

  const handleManageClients = () => {
    setIsOpen(false);
    if (user?.role === 'SUPER_ADMIN') {
      navigate('/admin/agencies');
      return;
    }

    navigate(workspacePath('/clients', user?.orgSlug || localStorage.getItem('nexus_org_slug')));
  };

  if (collapsed) {
    return (
      <div className="flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
        <Users size={20} />
      </div>
    );
  }

  return (
    <div className="relative px-2 mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[12px] font-extrabold text-gray-400 uppercase tracking-[0.08em]">
          {user?.role === 'SUPER_ADMIN' ? 'Selecionar Imobiliária' : 'Contexto de Operação'}
        </span>
      </div>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
          selectedClient 
            ? 'bg-blue-50/50 border-blue-100 text-blue-900 shadow-sm' 
            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            selectedClient ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            <Users size={18} />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-[14px] font-bold truncate">
              {selectedClient ? (selectedClient.corporateName) : 'Escolher Cliente'}
            </p>
            {selectedClient && <p className="text-[12px] font-medium opacity-70 truncate">Acesso Administrativo</p>}
          </div>
        </div>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-2 right-2 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 max-h-60 overflow-y-auto custom-scrollbar">
            <div 
              onClick={() => {
                onSelectClient(null);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-gray-50 ${!selectedClientId ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <span>Visão Global</span>
              {!selectedClientId && <Check size={14} />}
            </div>
            
            <div className="h-[1px] bg-gray-50 my-1" />
            
            {clients.map(client => (
              <div 
                key={client.id}
                onClick={() => {
                  onSelectClient(client.id);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-3 text-[13px] font-semibold cursor-pointer hover:bg-gray-50 ${selectedClientId === client.id ? 'text-blue-600 bg-blue-50/30' : 'text-gray-700'}`}
              >
                <span className="truncate">{client.corporateName}</span>
                {selectedClientId === client.id && <Check size={14} />}
              </div>
            ))}

            {canManageClients && (
              <>
                <div className="h-[1px] bg-gray-50 my-1" />
                <button
                  type="button"
                  onClick={handleManageClients}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus size={14} />
                  Cadastrar Cliente
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
