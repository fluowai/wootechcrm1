import { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  ChevronRight,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Layers
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

export default function SoldServices() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiFetch(`/api/sales/sold-services`);
        const data = await res.json();
        setServices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-600 border-green-100';
      case 'onboarding': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'paused': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Serviços Vendidos</h1>
          <p className="text-gray-500">Acompanhamento operacional das entregas contratadas.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-bold hover:bg-gray-50 shadow-sm transition-all">
             <Filter size={18} />
             Filtros
           </button>
        </div>
      </div>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {services.map((service) => (
          <motion.div 
            key={service.id}
            whileHover={{ y: -4 }}
            className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(service.status)}`}>
                {service.status}
              </div>
              <button className="text-gray-300 hover:text-gray-600">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Layers size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{service.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Building2 size={14} />
                  {service.client?.tradeName || service.client?.corporateName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Faturamento</p>
                <p className="text-sm font-bold text-gray-700">R$ {service.monthlyValue.toLocaleString()}/mês</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Início</p>
                <p className="text-sm font-bold text-gray-700">{new Date(service.startDate).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">AI</div>
                 <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">OP</div>
               </div>
               <Link 
                to={`/clients/${service.clientId}`}
                className="flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
               >
                 Gerenciar Operação
                 <ChevronRight size={18} />
               </Link>
            </div>
          </motion.div>
        ))}

        {services.length === 0 && !loading && (
          <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-4">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-300 shadow-sm">
               <ClipboardList size={40} />
             </div>
             <p className="text-gray-400 font-bold">Nenhum serviço em execução.</p>
             <Link to="/crm" className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 shadow-lg shadow-blue-200">Converter um Lead</Link>
          </div>
        )}
      </div>
    </div>
  );
}
