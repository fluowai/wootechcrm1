
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Send, 
  RefreshCw,
  Layout,
  MessageCircle,
  HelpCircle,
  Clock,
  Zap,
  ArrowRight
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'multiple_select' | 'rating' | 'text' | 'email' | 'phone';
  options?: string[];
  required?: boolean;
}

interface QuizExperienceProps {
  quizName: string;
  questions: Question[];
  onComplete: (answers: any) => void;
  onClose: () => void;
}

export default function QuizExperience({ quizName, questions, onComplete, onClose }: QuizExperienceProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 is Intro
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [direction, setDirection] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  const totalSteps = questions.length;
  const progress = currentStep === -1 ? 0 : ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;
      
      if (e.key === 'Enter' && currentStep === -1) {
        setCurrentStep(0);
      } else if (e.key === 'Enter' && answers[questions[currentStep]?.id]) {
        handleNext();
      }

      // Shortcut for multiple choice
      if (currentStep >= 0 && questions[currentStep].type === 'multiple_choice') {
        const num = parseInt(e.key);
        if (!isNaN(num) && num > 0 && num <= (questions[currentStep].options?.length || 0)) {
          handleAnswer(questions[currentStep].id, questions[currentStep].options![num - 1]);
          // Optional: handleNext() after short delay
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, answers, isCompleted]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      setIsCompleted(true);
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    } else if (currentStep === 0) {
      setDirection(-1);
      setCurrentStep(-1);
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-advance for multiple choice
    if (questions[currentStep].type === 'multiple_choice') {
      setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          setDirection(1);
          setCurrentStep(prev => prev + 1);
        } else {
          setIsCompleted(true);
          onComplete({ ...answers, [questionId]: value });
        }
      }, 400);
    }
  };

  const currentQuestion = questions[currentStep];

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col font-sans overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/20 translate-x-1/2 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-purple-50/20 -translate-x-1/2 rounded-full blur-[100px] pointer-events-none" />

      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-100 sticky top-0 z-50">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "circOut" }}
        />
      </div>

      {/* Header */}
      <div className="p-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 block leading-tight">{quizName}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by WooTech CRM</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 transition-all hover:rotate-90"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto w-full relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === -1 && !isCompleted && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="text-center space-y-10"
            >
              <div className="space-y-4">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-200"
                >
                  <MessageCircle className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  {quizName}
                </h1>
                <p className="text-2xl text-gray-500 max-w-xl mx-auto font-medium">
                  Vamos personalizar sua experiência. Leva apenas alguns segundos.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="bg-primary text-white px-10 py-5 rounded-[2rem] font-bold text-xl hover:bg-blue-600 transition-all shadow-2xl shadow-blue-200 flex items-center gap-4 group"
                >
                  Começar agora
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </button>
                <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Leva 1 min</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    <span>Aperte <strong>Enter</strong></span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep >= 0 && currentStep < totalSteps && !isCompleted && (
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -100 }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="w-full space-y-12"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {currentStep + 1}
                  </span>
                  <span className="text-primary font-bold text-sm tracking-widest uppercase">
                    Passo {currentStep + 1} de {totalSteps}
                  </span>
                </div>
                <h2 className="text-4xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                  {currentQuestion.text}
                </h2>
              </div>

              <div className="space-y-4">
                {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'multiple_select') && currentQuestion.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                    className={`w-full p-6 rounded-[1.5rem] border-2 text-left transition-all flex items-center justify-between group relative overflow-hidden ${
                      answers[currentQuestion.id] === option 
                        ? 'border-primary bg-blue-50/50 shadow-lg shadow-blue-50' 
                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-5 relative z-10">
                      <span className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black text-sm transition-all ${
                        answers[currentQuestion.id] === option 
                          ? 'bg-primary text-white border-primary shadow-lg shadow-blue-200' 
                          : 'bg-white text-gray-400 group-hover:border-blue-300 group-hover:text-blue-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className={`text-xl font-bold ${
                        answers[currentQuestion.id] === option ? 'text-primary' : 'text-gray-700'
                      }`}>
                        {option}
                      </span>
                    </div>
                    
                    <AnimatePresence>
                      {answers[currentQuestion.id] === option && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative z-10"
                        >
                          <Check className="w-6 h-6 text-primary" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Keyboard Hint */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      Press {idx + 1}
                    </div>
                  </button>
                ))}

                {currentQuestion.type === 'text' && (
                  <div className="space-y-4">
                    <textarea
                      autoFocus
                      placeholder="Escreva sua resposta incrível aqui..."
                      className="w-full p-8 rounded-[2rem] border-2 border-gray-100 focus:border-primary focus:ring-8 focus:ring-blue-50 outline-none transition-all text-2xl font-medium min-h-[200px] bg-gray-50/30"
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    />
                    <p className="text-gray-400 text-sm font-medium animate-pulse">Pressione <strong>Enter</strong> para continuar</p>
                  </div>
                )}

                {(currentQuestion.type === 'email' || currentQuestion.type === 'phone') && (
                  <div className="space-y-4">
                    <input
                      type={currentQuestion.type}
                      autoFocus
                      placeholder={currentQuestion.type === 'email' ? 'nome@empresa.com' : '(00) 00000-0000'}
                      className="w-full p-8 rounded-[2.5rem] border-2 border-gray-100 focus:border-primary focus:ring-8 focus:ring-blue-50 outline-none transition-all text-4xl font-black bg-gray-50/30 tracking-tight"
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    />
                    <p className="text-gray-400 text-sm font-medium animate-pulse">Pressione <strong>Enter</strong> para confirmar</p>
                  </div>
                )}

                {currentQuestion.type === 'rating' && (
                  <div className="flex justify-between gap-4">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleAnswer(currentQuestion.id, val)}
                        className={`flex-1 aspect-square rounded-[2rem] border-4 flex items-center justify-center text-4xl font-black transition-all ${
                          answers[currentQuestion.id] === val 
                            ? 'border-primary bg-primary text-white shadow-2xl shadow-blue-200' 
                            : 'border-gray-50 bg-gray-50/50 hover:border-blue-200 text-gray-400 hover:text-blue-500 hover:bg-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-12 border-t border-gray-100">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-bold transition-colors group"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  Voltar
                </button>
                
                {currentQuestion.type !== 'multiple_choice' && (
                  <button
                    disabled={!answers[currentQuestion.id] && currentQuestion.required}
                    onClick={handleNext}
                    className="bg-primary text-white px-10 py-5 rounded-[1.5rem] font-bold text-xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    Próxima
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {isCompleted && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="text-center space-y-10"
            >
              <div className="relative">
                <motion.div 
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-40 h-40 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-[3rem] blur-2xl opacity-20 mx-auto absolute inset-0"
                />
                <div className="w-32 h-32 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-green-100 relative z-10">
                  <Check className="w-16 h-16 text-white" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-5xl font-black text-gray-900 leading-tight">E-mail enviado!</h1>
                <p className="text-2xl text-gray-500 max-w-lg mx-auto font-medium">
                  Obrigado por completar nosso quiz. Entraremos em contato muito em breve.
                </p>
              </div>

              <button
                onClick={onClose}
                className="bg-gray-900 text-white px-12 py-5 rounded-[2rem] font-bold text-xl hover:bg-black transition-all shadow-2xl shadow-gray-200 flex items-center gap-3 mx-auto group"
              >
                Finalizar
                <Zap className="w-5 h-5 text-yellow-400 group-hover:scale-125 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-10 flex items-center justify-center relative z-10">
        <div className="px-6 py-2 bg-gray-50/50 rounded-full border border-gray-100 backdrop-blur-sm flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Tecnologia</span>
          <span className="text-xs text-gray-500 font-black italic tracking-tighter">CRM 360 NEXUS</span>
        </div>
      </div>
    </div>
  );
}
