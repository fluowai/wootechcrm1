import { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  Zap,
  Globe,
  Database,
  ShieldCheck,
  Server,
  UserPlus,
  Wallet,
  LayoutDashboard,
  MapPinned
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";
import { Link } from "react-router-dom";

export default function SuperAdmin() {
  const [metrics, setMetrics] = useState({ agencies: 0, totalUsers: 0, totalLeads: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiFetch('/api/admin/metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch admin metrics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 -m-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Visão Geral</h1>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { 
              label: "Clientes / Agências", 
              value: metrics.agencies, 
              icon: Building2, 
              iconColor: "text-white", 
              iconBg: "bg-blue-500",
              shadow: "shadow-blue-200",
              path: "/admin/agencies"
            },
            { 
              label: "Usuários Totais", 
              value: metrics.totalUsers, 
              icon: Users, 
              iconColor: "text-white", 
              iconBg: "bg-emerald-500",
              shadow: "shadow-emerald-200",
              path: "/admin/team"
            },
            { 
              label: "Receita Est. (SaaS)", 
              value: `R$ ${metrics.revenue}`, 
              icon: Wallet, 
              iconColor: "text-white", 
              iconBg: "bg-indigo-500",
              shadow: "shadow-indigo-200",
              path: "/admin/billing"
            },
            { 
              label: "Leads Capturados", 
              value: metrics.totalLeads, 
              icon: Zap, 
              iconColor: "text-white", 
              iconBg: "bg-purple-500",
              shadow: "shadow-purple-200",
              path: "/admin/monitor"
            },
          ].map((card, i) => (
            <Link to={card.path} key={i} className="no-underline">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full"
              >
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                  <h3 className="text-3xl font-black text-gray-900">{card.value}</h3>
                </div>
                <div className={`w-14 h-14 ${card.iconBg} rounded-[20px] flex items-center justify-center ${card.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                  <card.icon className={card.iconColor} size={28} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[350px] relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8">
                <Activity className="text-gray-300" size={20} />
                <h3 className="text-lg font-bold text-gray-900">Atividade Recente</h3>
              </div>
              
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                 <p className="text-gray-400 text-sm font-medium">Nenhuma atividade recente registrada.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[350px] relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="text-gray-300" size={20} />
                <h3 className="text-lg font-bold text-gray-900">Acesso Rápido</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <Link to="/admin/agencies" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 group transition-all">
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-blue-600 transition-colors">
                    <Building2 size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Gerenciar Clientes</span>
                </Link>
                <Link to="/admin/team" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 group transition-all">
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-emerald-600 transition-colors">
                    <Users size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Contas de Usuários</span>
                </Link>
                <Link to="/admin/plans" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 group transition-all">
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-indigo-600 transition-colors">
                    <CreditCard size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Editar Planos</span>
                </Link>
                <Link to="/admin/monitor" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-purple-50 group transition-all">
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-purple-600 transition-colors">
                    <Server size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Status do Sistema</span>
                </Link>
                <Link to="/admin/google-local" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 group transition-all">
                  <div className="p-2 bg-white rounded-xl shadow-sm group-hover:text-emerald-600 transition-colors">
                    <MapPinned size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Acessos Google Local</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

