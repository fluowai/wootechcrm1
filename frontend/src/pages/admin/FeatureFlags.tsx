import { useState } from "react";
import {
  Flag,
  Video,
  Zap,
  MessageSquare,
  Globe,
  ShieldCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminFlags() {
  const [flags, setFlags] = useState([
    { id: 'video_meet', name: 'Módulo Vídeo Meet', status: true, desc: 'Habilita videoconferência para todas as agências.', icon: Video, color: 'text-blue-500' },
    { id: 'ai_import', name: 'Importador IA', status: true, desc: 'Permite o uso de IA para importar leads.', icon: Zap, color: 'text-indigo-500' },
    { id: 'custom_domain', name: 'Domínios Personalizados', status: false, desc: 'Permite mapeamento de DNS CNAME.', icon: Globe, color: 'text-emerald-500' },
    { id: 'agency_white_label', name: 'White Label Master', status: false, desc: 'Remove a marca WooTech CRM do rodapé.', icon: ShieldCheck, color: 'text-purple-500' },
  ]);

  const toggleFlag = (id: string) => {
    setFlags(flags.map(f => f.id === id ? { ...f, status: !f.status } : f));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-sm text-gray-500">Controle a visibilidade e acesso de funcionalidades em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs">
          <Flag size={16} />
          MODO DE DESENVOLVIMENTO
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {flags.map((flag) => (
          <div key={flag.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-start gap-6 relative overflow-hidden group">
            <div className={`w-14 h-14 rounded-2xl bg-gray-50 ${flag.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
              <flag.icon size={28} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{flag.name}</h3>
                <button
                  onClick={() => toggleFlag(flag.id)}
                  className={`transition-colors ${flag.status ? 'text-emerald-500' : 'text-gray-300'}`}
                >
                  {flag.status ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                </button>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed pr-8">{flag.desc}</p>

              <div className="mt-4 flex gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flag.status ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                  {flag.status ? 'ATIVO' : 'DESATIVADO'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">GLOBAL</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[24px] flex items-start gap-4">
        <AlertCircle className="text-amber-600 shrink-0" size={24} />
        <div>
          <p className="text-amber-800 font-bold text-sm">Aviso de Segurança</p>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
            Alterar Feature Flags afeta instantaneamente a experiência de todos os usuários na plataforma.
            Certifique-se de que o módulo está estável antes de habilitar globalmente.
          </p>
        </div>
      </div>
    </div>
  );
}
