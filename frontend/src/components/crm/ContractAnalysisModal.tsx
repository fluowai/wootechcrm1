import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  X, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  Upload
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface ContractAnalysisModalProps {
  onClose: () => void;
  onSelect: (templateId: string, content: string) => void;
}

export const ContractAnalysisModal: React.FC<ContractAnalysisModalProps> = ({ onClose, onSelect }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/ai/analyze-contracts', {
        method: 'POST',
        body: JSON.stringify({ modelA, modelB })
      });
      const data = await response.json();
      setAnalysis(data);
      setStep(2);
    } catch (error) {
      console.error(error);
      alert("Erro ao analisar modelos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden relative z-10 flex flex-col h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Inteligência Jurídica WooTech</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Análise Comparativa de Contratos</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-all"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-8 h-full">
                <div className="flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modelo A (Padrão Agência)</label>
                    <button className="text-[10px] text-primary font-bold hover:underline">Subir PDF/DOCX</button>
                  </div>
                  <textarea 
                    className="modal-input flex-1 min-h-[300px] resize-none font-mono text-xs" 
                    placeholder="Cole aqui o conteúdo do primeiro modelo de contrato..."
                    value={modelA}
                    onChange={e => setModelA(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modelo B (Alternativo / Personalizado)</label>
                    <button className="text-[10px] text-primary font-bold hover:underline">Subir PDF/DOCX</button>
                  </div>
                  <textarea 
                    className="modal-input flex-1 min-h-[300px] resize-none font-mono text-xs" 
                    placeholder="Cole aqui o conteúdo do segundo modelo de contrato..."
                    value={modelB}
                    onChange={e => setModelB(e.target.value)}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 pb-10">
                {/* Dashboard de Comparação da IA */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm mb-2">
                      <ArrowLeftRight size={20} />
                    </div>
                    <h4 className="font-bold text-blue-900">Nível de Rigidez</h4>
                    <p className="text-xs text-blue-600 leading-relaxed">{analysis?.stiffnessSummary}</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-3xl border border-green-100 flex flex-col gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-600 shadow-sm mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <h4 className="font-bold text-green-900">Modelo Recomendado</h4>
                    <p className="text-sm font-black text-green-600">Modelo {analysis?.recommended}</p>
                    <p className="text-xs text-green-600/70">{analysis?.recommendationReason}</p>
                  </div>
                  <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm mb-2">
                      <AlertTriangle size={20} />
                    </div>
                    <h4 className="font-bold text-orange-900">Riscos Detectados</h4>
                    <p className="text-xs text-orange-600 leading-relaxed">{analysis?.risksSummary}</p>
                  </div>
                </div>

                {/* Diferenças Detalhadas */}
                <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100">
                  <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-6">Diferenças Técnicas (Modelo A vs B)</h4>
                  <div className="space-y-4">
                    {analysis?.differences?.map((diff: any, idx: number) => (
                      <div key={idx} className="flex gap-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Cláusula: {diff.topic}</p>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-gray-200 italic">{diff.modelA}</div>
                            <div className="text-xs text-gray-700 font-medium bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400 italic">{diff.modelB}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <button 
            onClick={() => setStep(1)} 
            disabled={step === 1}
            className={`font-bold text-sm ${step === 1 ? 'text-gray-300 pointer-events-none' : 'text-gray-600 hover:underline'}`}
          >
            Voltar para Modelos
          </button>
          
          <div className="flex gap-4">
            {step === 1 ? (
              <button 
                onClick={handleAnalyze}
                disabled={loading || !modelA || !modelB}
                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-black shadow-xl disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Sparkles size={20} /> Analisar com IA</>}
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => onSelect('model-a', modelA)}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Usar Modelo A
                </button>
                <button 
                  onClick={() => onSelect('model-b', modelB)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  Usar Modelo B Selecionado
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
