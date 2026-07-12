import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Check, FileText, CreditCard, UserCheck, Rocket, Sparkles,
  ChevronLeft, ChevronRight, Copy, QrCode, Loader2,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import SignaturePad from "./SignaturePad";

interface CloserPopupProps {
  clientId: string;
  onClose: () => void;
  onComplete?: () => void;
}

type Step = "review" | "contract" | "sign" | "payment" | "done";

interface ClientData {
  client: any;
  serviceCatalog: any[];
  contractTemplates: any[];
}

export default function CloserPopup({ clientId, onClose, onComplete }: CloserPopupProps) {
  const [step, setStep] = useState<Step>("review");
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [contractHtml, setContractHtml] = useState("");
  const [contractId, setContractId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [soldProductId, setSoldProductId] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/closing/client/${clientId}/review`);
      const data = await res.json();
      setClientData(data);
      if (data.contractTemplates?.length > 0) {
        setSelectedTemplate(data.contractTemplates[0].id);
      }
    } catch (err) {
      setError("Erro ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/closing/client/${clientId}/verify`, {
        method: "POST",
        body: JSON.stringify({ checklistItems: ["Dados conferidos", "Produto definido", "Valor aprovado"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("contract");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/closing/contract/generate", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          templateId: selectedTemplate,
          soldProductId: soldProductId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContractHtml(data.html);
      setContractId(data.contract.id);
      setContractNumber(data.contract.contractNumber);
      setStep("sign");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signatureData) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/closing/contract/${contractId}/sign`, {
        method: "POST",
        body: JSON.stringify({
          signerName: clientData?.client?.responsibleName || clientData?.client?.corporateName,
          signerCpf: clientData?.client?.responsibleCpf || clientData?.client?.cnpj,
          signerEmail: clientData?.client?.responsibleEmail || clientData?.client?.email,
          signatureData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("payment");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePix = async (provider: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/closing/contract/${contractId}/payment/pix`, {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentInfo(data.payment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/closing/client/${clientId}/finalize`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Cliente encaminhado para onboarding!");
      setStep("done");
      onComplete?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading && !clientData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-[32px] p-8 shadow-2xl">
          <Loader2 className="animate-spin text-primary mx-auto" size={32} />
        </div>
      </div>
    );
  }

  const client = clientData?.client;
  const stepLabels: Record<Step, string> = {
    review: "Revisar Dados",
    contract: "Gerar Contrato",
    sign: "Assinar",
    payment: "Pagamento",
    done: "Concluído",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-100 rounded-t-[32px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Fechamento</h2>
              <p className="text-xs text-gray-500">{client?.corporateName} — {stepLabels[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-6">
            {(["review", "contract", "sign", "payment", "done"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition ${
                  step === s ? "bg-primary text-white" : ["done"].includes(step) && ["review", "contract", "sign", "payment", "done"].indexOf(s) <= ["review", "contract", "sign", "payment", "done"].indexOf(step) ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {["done"].includes(step) && ["review", "contract", "sign", "payment", "done"].indexOf(s) < ["review", "contract", "sign", "payment", "done"].indexOf(step) ? <Check size={14} /> : i + 1}
                </div>
                {i < 4 && <div className={`h-1 flex-1 rounded-full ${["done"].includes(step) && ["review", "contract", "sign", "payment", "done"].indexOf(s) < ["review", "contract", "sign", "payment", "done"].indexOf(step) ? "bg-green-500" : "bg-gray-100"}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-sm font-semibold">{success}</div>
          )}

          <AnimatePresence mode="wait">
            {step === "review" && client && (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h3 className="text-xl font-black">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Razão Social", value: client.corporateName },
                    { label: "CNPJ", value: client.cnpj },
                    { label: "Email", value: client.email },
                    { label: "Telefone", value: client.phone || client.responsiblePhone },
                    { label: "Responsável", value: client.responsibleName },
                    { label: "Cidade/UF", value: `${client.city || ""}${client.state ? ` - ${client.state}` : ""}` },
                    { label: "Status", value: client.status },
                  ].map((item) => (
                    <div key={item.label} className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-2">Checklist de Verificação</p>
                  <div className="space-y-2">
                    {["CNPJ ativo na Receita Federal", "Dados de contato conferidos", "Produto/Serviço definido", "Valor aprovado"].map((item) => (
                      <label key={item} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-primary" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-600">Catálogo de Serviços</p>
                  <select
                    value={soldProductId}
                    onChange={(e) => setSoldProductId(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-sm"
                  >
                    <option value="">Selecione um serviço...</option>
                    {clientData?.serviceCatalog?.map((svc: any) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} — R$ {svc.setupValue} setup + R$ {svc.monthlyValue}/mês
                      </option>
                    ))}
                  </select>
                </div>

                <button onClick={handleVerify} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-dark transition disabled:opacity-50">
                  {loading ? "Carregando..." : "Dados Verificados — Avançar"} <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === "contract" && (
              <motion.div key="contract" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h3 className="text-xl font-black">Gerar Contrato</h3>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-600">Template do Contrato</p>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-sm"
                  >
                    {clientData?.contractTemplates?.map((tpl: any) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                <button onClick={handleGenerateContract} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-dark transition disabled:opacity-50">
                  {loading ? "Gerando..." : "Gerar Contrato"} <FileText size={18} />
                </button>

                <button onClick={() => setStep("sign")} disabled={!contractId} className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary font-black py-4 rounded-2xl hover:bg-primary/5 transition disabled:opacity-50">
                  Contrato já gerado? Pular para assinatura <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === "sign" && (
              <motion.div key="sign" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h3 className="text-xl font-black">Assinatura Digital</h3>

                {contractHtml && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-500">Contrato #{contractNumber}</span>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: contractHtml }} />
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-600">Assinatura do Cliente</p>
                  <p className="text-xs text-gray-400">Desenhe a assinatura no campo abaixo</p>
                  <SignaturePad onSave={setSignatureData} />
                </div>

                <button onClick={handleSign} disabled={loading || !signatureData} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-black py-4 rounded-2xl hover:bg-primary-dark transition disabled:opacity-50">
                  {loading ? "Registrando..." : "Confirmar Assinatura"} <UserCheck size={18} />
                </button>
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h3 className="text-xl font-black">Pagamento via PIX</h3>

                <div className="flex gap-3">
                  {["ASAAS", "MERCADO_PAGO", "INTER"].map((prov) => (
                    <button
                      key={prov}
                      onClick={() => handleGeneratePix(prov)}
                      disabled={loading}
                      className="flex-1 p-4 border-2 border-gray-200 rounded-2xl text-center font-bold hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
                    >
                      <CreditCard size={24} className="mx-auto mb-2" />
                      <span className="text-sm">{prov.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>

                {paymentInfo && (
                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <QrCode size={32} className="text-primary" />
                      <div>
                        <p className="text-sm font-bold">QR Code PIX</p>
                        <p className="text-xs text-gray-500">Escaneie com o app do seu banco</p>
                      </div>
                    </div>

                    {paymentInfo.qrCodeBase64 && (
                      <div className="flex justify-center">
                        <img src={`data:image/png;base64,${paymentInfo.qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48" />
                      </div>
                    )}

                    {paymentInfo.pixCopiaECola && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500">Código PIX Copia e Cola</p>
                        <div className="flex gap-2">
                          <input readOnly value={paymentInfo.pixCopiaECola} className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-xs font-mono" />
                          <button onClick={() => copyPix(paymentInfo.pixCopiaECola)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition flex items-center gap-1">
                            <Copy size={14} /> {copied ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleFinalize} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-black py-4 rounded-2xl hover:bg-green-700 transition disabled:opacity-50">
                  {loading ? "Finalizando..." : "Pagamento Confirmado — Finalizar"} <Rocket size={18} />
                </button>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-5">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check size={40} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Fechamento Concluído!</h3>
                <p className="text-gray-500">Cliente encaminhado para onboarding.</p>
                <button onClick={onClose} className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition">
                  Fechar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex justify-between rounded-b-[32px]">
          <button
            onClick={() => {
              const steps: Step[] = ["review", "contract", "sign", "payment", "done"];
              const idx = steps.indexOf(step);
              if (idx > 0) setStep(steps[idx - 1]);
            }}
            disabled={step === "review" || step === "done"}
            className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-500 disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          {step !== "done" && (
            <span className="text-xs text-gray-400 self-center">{stepLabels[step]}</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
