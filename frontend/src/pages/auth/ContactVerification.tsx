import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { workspacePath } from "../../lib/workspaceRoute";

type Channel = "EMAIL" | "PHONE";

export default function ContactVerification() {
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestCode = async (nextChannel = channel) => {
    setLoading(true);
    setError("");
    setMessage("");
    setDevCode("");
    try {
      const res = await apiFetch("/api/auth/verification/start", {
        method: "POST",
        body: JSON.stringify({ channel: nextChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nao foi possivel gerar o codigo.");
      setMessage(nextChannel === "EMAIL" ? "Codigo enviado para o e-mail cadastrado." : "Codigo enviado para o telefone cadastrado.");
      if (data.devCode) setDevCode(data.devCode);
      if (data.delivery === "provider_required") {
        setMessage("Canal de envio pendente de configuracao no provedor.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/verification/confirm", {
        method: "POST",
        body: JSON.stringify({ channel, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Codigo invalido.");

      const orgSlug = localStorage.getItem("nexus_org_slug") || "";
      const orgType = localStorage.getItem("nexus_org_type") || "CLIENT";
      localStorage.removeItem("nexus_contact_verification_required");

      if (orgType === "WHITELABEL") {
        navigate("/onboarding/whitelabel", { replace: true });
      } else if (localStorage.getItem("nexus_onboarding_done") === "true") {
        navigate(workspacePath("/dashboard", orgSlug), { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseChannel = (nextChannel: Channel) => {
    setChannel(nextChannel);
    setCode("");
    requestCode(nextChannel);
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">Validar contato</h1>
            <p className="text-sm font-medium text-slate-500">Confirme e-mail ou telefone para liberar a conta.</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => chooseChannel("EMAIL")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all ${channel === "EMAIL" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <Mail size={17} />
            E-mail
          </button>
          <button
            type="button"
            onClick={() => chooseChannel("PHONE")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all ${channel === "PHONE" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <Phone size={17} />
            Telefone
          </button>
        </div>

        <form onSubmit={confirmCode} className="space-y-4">
          <button
            type="button"
            onClick={() => requestCode()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            Gerar codigo
          </button>

          {message && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}
          {devCode && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              Codigo de teste: {devCode}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Codigo de 6 digitos</label>
            <input
              required
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-center text-2xl font-black tracking-[0.45em] text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 font-black text-white transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            Confirmar e continuar
          </button>
        </form>
      </div>
    </div>
  );
}
