import { useEffect, useState } from "react";
import { ArrowRight, Lock, Mail, Phone, ShieldCheck, User, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { hasAccessToken, publicApiFetch, readJsonResponse, setAccessToken } from "../../lib/api";
import { useWhitelabel } from "../../lib/useWhitelabel";

export default function WhitelabelDomainOnboarding({ onAuthenticated }: { onAuthenticated?: (user: any) => void }) {
  const navigate = useNavigate();
  const { config: whiteLabel, customDomain, loading: whitelabelLoading } = useWhitelabel();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminExists, setAdminExists] = useState(false);

  const brandLabel = whiteLabel?.name || "Nexus360";

  useEffect(() => {
    if (hasAccessToken()) {
      navigate("/onboarding/whitelabel", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!whitelabelLoading && !customDomain) {
      navigate("/login", { replace: true });
    }
  }, [customDomain, navigate, whitelabelLoading]);

  const persistSession = (user: any, token: string) => {
    setAccessToken(token);
    onAuthenticated?.(user);
    localStorage.setItem("nexus_user_role", user.role);
    localStorage.setItem("nexus_user_name", user.name || "");
    localStorage.setItem("nexus_org_id", user.orgId);
    localStorage.setItem("nexus_org_slug", user.orgSlug || "");
    localStorage.setItem("nexus_org_type", user.orgType || "WHITELABEL");
    localStorage.setItem("nexus_beta_access", String(user.betaAccess || false));
    localStorage.setItem("nexus_is_test", String(user.isTestAccount || false));
    localStorage.removeItem("nexus_onboarding_done");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAdminExists(false);

    try {
      if (password !== confirmPassword) {
        throw new Error("As senhas nao conferem.");
      }

      const res = await publicApiFetch("/api/auth/register/custom-domain-admin", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await readJsonResponse(res, "Nao foi possivel conectar a API do dominio.");

      if (!res.ok) {
        if (data.code === "ADMIN_ALREADY_EXISTS") setAdminExists(true);
        throw new Error(data.error || data.details || "Nao foi possivel criar o usuario.");
      }

      persistSession(data.user, data.token);
      if (data.user.contactVerification?.required) {
        localStorage.setItem("nexus_contact_verification_required", "true");
        navigate("/verify-contact", { replace: true });
        return;
      }
      navigate("/onboarding/whitelabel", { replace: true });
    } catch (err: any) {
      setError(err.message || "Nao foi possivel criar o usuario.");
    } finally {
      setLoading(false);
    }
  };

  if (whitelabelLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#F8FAFC] px-4 py-8 font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-[28px] border border-white bg-white p-8 shadow-2xl shadow-blue-100/50 sm:p-10"
        >
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={brandLabel} className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-blue-100" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <Zap size={32} className="fill-current" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-950">{brandLabel}</h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">Criar acesso white-label</p>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-medium text-blue-800">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>Este cadastro sera vinculado ao dominio verificado desta marca.</span>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-600">
              {error}
              {adminExists && (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="mt-3 block font-bold text-red-700 underline"
                >
                  Ir para o login
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome completo</span>
              <span className="relative block">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">E-mail profissional</span>
              <span className="relative block">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Telefone com DDD</span>
              <span className="relative block">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Senha</span>
              <span className="relative block">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder="Minimo 8 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Confirmar senha</span>
              <span className="relative block">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </span>
            </label>

            <button
              disabled={loading}
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Criando acesso..." : "Criar usuario e iniciar onboarding"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
