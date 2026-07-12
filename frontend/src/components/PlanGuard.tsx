import React from 'react';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PlanGuardProps {
  children: React.ReactNode;
  feature: string;
  requiredPlan: 'Free' | 'Pro' | 'Enterprise';
  currentPlan: string;
}

const PLAN_HIERARCHY = {
  'Free': 0,
  'Pro': 1,
  'Enterprise': 2
};

export const PlanGuard: React.FC<PlanGuardProps> = ({ 
  children, 
  feature, 
  requiredPlan, 
  currentPlan 
}) => {
  const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY] || 0;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan];

  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[400px] flex items-center justify-center p-8 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-200 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md text-center"
      >
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-gray-200 flex items-center justify-center mx-auto mb-6 text-primary border border-gray-100">
          <Lock size={32} />
        </div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
          <Sparkles size={12} />
          <span>Recurso Premium</span>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {feature}
        </h3>
        
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Este recurso está disponível apenas para clientes com o plano <strong>{requiredPlan}</strong> ou superior. Faça o upgrade agora e desbloqueie o poder total do WooTech CRM.
        </p>

        <div className="flex flex-col gap-3">
          <button className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group">
            <span>Fazer Upgrade para {requiredPlan}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
            Comparar Planos
          </button>
        </div>
      </motion.div>
    </div>
  );
};
