import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  Target, 
  Users, 
  Zap, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Key,
  UserPlus,
  ShieldCheck,
  BrainCircuit
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  { id: 1, title: "Introdução", icon: Rocket },
  { id: 2, title: "Sua Agência", icon: Target },
  { id: 3, title: "Seu Time", icon: UserPlus },
  { id: 4, title: "Setup da IA", icon: BrainCircuit },
  { id: 5, title: "Pronto!", icon: Sparkles },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    agencyName: '',
    niche: '',
    teamMembers: [] as { name: string, role: string }[],
    openaiKey: '',
    anthropicKey: '',
    aiModel: 'gpt-4o'
  });
  
  const [tempMember, setTempMember] = useState({ name: '', role: 'Comercial' });
  const navigate = useNavigate();

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addMember = () => {
    if (tempMember.name) {
      setFormData(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, tempMember]
      }));
      setTempMember({ name: '', role: 'Comercial' });
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem('nexus_onboarding_done', 'true');
    // Aqui você enviaria os dados para o backend para persistência
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-4 font-sans overflow-hidden">
      {/* Background Neon */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Progresso Lateral */}
        <div className="lg:col-span-4 space-y-8 hidden lg:block">
          <div className="mb-12">
             <div className="flex items-center gap-3 text-2xl font-black tracking-tighter italic">
               <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 not-italic">N</div>
               NEXUS<span className="text-primary">360</span>
             </div>
          </div>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-6 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                currentStep >= s.id ? 'bg-primary border-primary text-white shadow-xl shadow-blue-500/20' : 'bg-white/5 border-white/10 text-gray-500'
              }`}>
                {currentStep > s.id ? <CheckCircle2 size={24} /> : <s.icon size={24} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentStep >= s.id ? 'text-primary' : 'text-gray-500'}`}>
                  Step {s.id}
                </span>
                <span className={`font-bold text-lg transition-colors ${currentStep >= s.id ? 'text-white' : 'text-gray-600'}`}>
                  {s.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Conteúdo Principal */}
        <div className="lg:col-span-8 w-full">
          <motion.div 
            layout
            className="bg-white/5 backdrop-blur-2xl rounded-[48px] p-8 lg:p-14 border border-white/10 shadow-3xl shadow-black/50"
          >
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mb-4 border border-primary/20">
                    <Rocket size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                      Sua jornada épica começa aqui.
                    </h1>
                    <p className="text-gray-400 text-lg">
                      Vamos configurar as bases da sua agência inteligente. Em instantes você terá acesso ao ecossistema <span className="text-primary font-bold">Nexus360</span>.
                    </p>
                  </div>
                  <button 
                    onClick={nextStep}
                    className="flex items-center gap-4 bg-primary text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all shadow-2xl shadow-blue-500/40"
                  >
                    Vamos lá
                    <ChevronRight size={24} />
                  </button>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-4xl font-black">Identidade da Agência</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome da Operação</label>
                      <input 
                        placeholder="Ex: Consultio CRM"
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary focus:bg-white/10 transition-all text-xl"
                        value={formData.agencyName}
                        onChange={e => setFormData({...formData, agencyName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Foco do Negócio</label>
                      <div className="grid grid-cols-2 gap-4">
                        {['Marketing Digital', 'SaaS', 'Consultoria', 'Infoprodutos'].map(n => (
                          <button
                            key={n}
                            onClick={() => setFormData({...formData, niche: n})}
                            className={`p-4 rounded-xl border-2 transition-all font-bold ${
                              formData.niche === n ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={prevStep} className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-gray-400">
                      <ArrowLeft size={24} />
                    </button>
                    <button 
                      onClick={nextStep}
                      disabled={!formData.agencyName}
                      className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      Próximo Passo
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-4xl font-black">Estrutura do Time</h2>
                    <p className="text-gray-500 mt-2">Adicione os membros que vão operar com você.</p>
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                    <div className="flex gap-3">
                      <input 
                        placeholder="Nome do membro"
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none"
                        value={tempMember.name}
                        onChange={e => setTempMember({...tempMember, name: e.target.value})}
                      />
                      <select 
                        className="bg-white/5 border border-white/10 rounded-xl px-4 outline-none text-gray-400"
                        value={tempMember.role}
                        onChange={e => setTempMember({...tempMember, role: e.target.value})}
                      >
                        <option value="Comercial">Comercial</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Operacional">Operacional</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button onClick={addMember} className="p-3 bg-primary rounded-xl hover:bg-blue-600 transition-all">
                        <UserPlus size={20} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {formData.teamMembers.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                          <span className="font-bold text-sm">{m.name}</span>
                          <span className="text-[10px] uppercase font-bold text-primary">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="p-5 rounded-2xl bg-white/5 text-gray-400 border border-white/10">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={nextStep} className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg">
                      Continuar para IA
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-4xl font-black italic">Setup do Cérebro (IA)</h2>
                    <p className="text-gray-500 mt-2">Conecte suas chaves para habilitar a automação.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">OpenAI API Key</label>
                        <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Recomendado</span>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                        <input 
                          type="password"
                          placeholder="sk-..."
                          className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm"
                          value={formData.openaiKey}
                          onChange={e => setFormData({...formData, openaiKey: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Modelo Principal</label>
                      <select 
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none appearance-none"
                        value={formData.aiModel}
                        onChange={e => setFormData({...formData, aiModel: e.target.value})}
                      >
                        <option value="gpt-4o">GPT-4o (Mais Rápido)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex gap-4 items-start">
                    <ShieldCheck className="text-blue-500 shrink-0" size={20} />
                    <p className="text-[10px] text-gray-400">Suas chaves são criptografadas e nunca são compartilhadas. Você pode alterar isso a qualquer momento nas configurações.</p>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="p-5 rounded-2xl bg-white/5 text-gray-400 border border-white/10">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={nextStep} className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20">
                      Finalizar Configuração
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-10 py-10"
                >
                  <div className="relative inline-block">
                    <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                       className="absolute -inset-8 bg-gradient-to-tr from-primary to-purple-500 rounded-full blur-3xl opacity-20"
                    />
                    <div className="w-32 h-32 bg-primary text-white rounded-[40px] flex items-center justify-center mx-auto relative z-10 shadow-3xl shadow-primary/40">
                      <CheckCircle2 size={64} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-5xl font-black italic">Você está no comando.</h2>
                    <p className="text-gray-400 max-w-md mx-auto text-lg leading-relaxed">
                      Configuração concluída para a <span className="text-white font-bold">{formData.agencyName}</span>. 
                      Sua IA já está pré-aquecida e seu time pronto para a escala.
                    </p>
                  </div>

                  <button 
                    onClick={finishOnboarding}
                    className="w-full bg-white text-gray-900 py-6 rounded-[32px] font-black text-xl hover:bg-gray-100 transition-all shadow-2xl"
                  >
                    DECOLAR AGORA
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
