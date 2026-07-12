import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Monitor, Palette, Globe, Users, Key, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";

export default function WhitelabelOnboardingPreview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch("/api/onboarding/whitelabel/status");
      const data = await res.json();
      setStatus(data);
      if (!data.whitelabel) {
        navigate("/onboarding", { replace: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("nexus_onboarding_done", "true");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const brand = status?.brand || {};

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex items-center gap-3 text-2xl font-black tracking-tighter italic mb-12">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" className="w-10 h-10 rounded-xl object-contain" />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 not-italic">
              <Monitor size={20} />
            </div>
          )}
          <span>{brand.name || "Nexus360"}</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-10 py-10"
        >
          <div className="w-24 h-24 bg-green-500/10 text-green-400 rounded-[32px] flex items-center justify-center mx-auto border border-green-500/20">
            <CheckCircle2 size={48} />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              Ambiente White Label Ativo!
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Sua agência está configurada com sua própria marca, domínio e equipe.
              Agora você pode gerenciar seus clientes de forma personalizada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
            <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="text-blue-400" size={20} />
                <h3 className="font-black text-lg">Marca</h3>
              </div>
              {brand.logoUrl && (
                <img src={brand.logoUrl} alt="Logo" className="h-10 mb-3 rounded-lg" />
              )}
              <p className="text-sm font-bold">{brand.name}</p>
              <div className="flex gap-2 mt-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: brand.primaryColor || "#3B82F6" }} />
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: brand.secondaryColor || "#1E40AF" }} />
              </div>
            </div>

            {status?.domain && (
              <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="text-green-400" size={20} />
                  <h3 className="font-black text-lg">Domínio</h3>
                </div>
                <p className="text-sm font-mono font-bold">{status.domain}</p>
                <p className="text-[10px] text-gray-500 mt-2">Domínio personalizado ativo</p>
              </div>
            )}
          </div>

          <button
            onClick={handleFinish}
            className="inline-flex items-center gap-3 bg-white text-gray-900 px-12 py-6 rounded-[32px] font-black text-xl hover:bg-gray-100 transition-all shadow-2xl"
          >
            <Sparkles size={24} />
            ACESSAR PLATAFORMA
          </button>
        </motion.div>
      </div>
    </div>
  );
}
