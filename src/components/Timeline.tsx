import React from 'react';
import { Check } from 'lucide-react';

export type Step = {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'locked' | 'pending_admin_approval';
};

export default function Timeline({ steps }: { steps: Step[] }) {
  // Determine if a step should be rendered as "in_progress" based on logic in ContractTimeline
  const firstIncompleteIndex = steps.findIndex(s => s.status !== 'completed');

  return (
    <div className="w-full pb-6 overflow-x-auto no-scrollbar">
      <div className="flex items-start justify-between w-full relative min-w-[800px] px-12">
        {/* Background Track - Fixed length logic */}
        <div className="absolute left-[50px] right-[50px] top-[24px] h-[1px] bg-gray-100 z-0 shadow-sm"></div>
        
        {/* Active Progress Line */}
        <div 
          className="absolute left-[50px] top-[24px] h-[1.5px] bg-blue-500 z-[1] transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          style={{ 
            width: `calc(${Math.max(0, firstIncompleteIndex === -1 ? steps.length - 1 : firstIncompleteIndex) / (steps.length - 1) * 100}% - ${firstIncompleteIndex === steps.length - 1 ? '0px' : '0px'})`,
            right: 'auto'
          }}
        ></div>
        
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isPendingAdmin = step.status === 'pending_admin_approval';
          const isInProgress = firstIncompleteIndex === index && !isPendingAdmin;
          const isNext = index > firstIncompleteIndex && firstIncompleteIndex !== -1;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 group">
              {/* Node Section */}
              <div 
                className={`w-12 h-12 rounded-[18px] flex items-center justify-center font-bold text-sm transition-all duration-700 relative
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100' : 
                    isInProgress ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 ring-4 ring-blue-50' : 
                    isPendingAdmin ? 'bg-amber-100 text-amber-600 border-2 border-amber-400 animate-pulse' :
                    'bg-white text-gray-300 border border-gray-100'}`}
              >
                {isCompleted ? (
                  <Check size={20} strokeWidth={3} className="drop-shadow-sm" />
                ) : (
                  <span className={`${isInProgress ? 'scale-110' : ''} tracking-tighter`}>{index + 1}</span>
                )}
                
                {/* Active pulse effect */}
                {isInProgress && (
                  <span className="absolute -inset-1 rounded-[18px] bg-blue-500/20 animate-ping -z-10"></span>
                )}
              </div>

              {/* Text Labels - Symmetric and Premium spacing */}
              <div className="mt-8 flex flex-col items-center text-center gap-1.5 transform group-hover:scale-105 transition-transform duration-300">
                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] max-w-[120px] leading-tight transition-colors duration-500
                  ${isCompleted ? 'text-emerald-700' : 
                    isInProgress ? 'text-blue-900 font-black' : 
                    isPendingAdmin ? 'text-amber-700' : 
                    'text-gray-300'}`}>
                  {step.title}
                </span>
                
                {/* Visual state badges */}
                <div className="h-4 flex items-center">
                  {isCompleted && (
                    <span className="text-[8px] font-bold text-emerald-500/70 border border-emerald-100 px-2 py-0.5 rounded-full bg-emerald-50/50">OK</span>
                  )}
                  {isInProgress && (
                    <span className="text-[8px] font-black text-blue-600 border-2 border-blue-100 px-2 py-0.5 rounded-full bg-blue-50 shadow-sm">ATIVO</span>
                  )}
                  {isPendingAdmin && (
                    <span className="text-[8px] font-bold text-amber-500 animate-pulse uppercase tracking-widest">Validando</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
