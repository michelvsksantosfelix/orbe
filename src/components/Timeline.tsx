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
    <div className="w-full pb-4 sm:pb-8 overflow-x-auto hide-scrollbar">
      <div className="flex items-start justify-between w-full relative min-w-[700px] px-8">
        {/* Background Track Line */}
        <div className="absolute left-[8%] right-[8%] top-[24px] h-[2px] bg-gray-100 z-0"></div>
        
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isPendingAdmin = step.status === 'pending_admin_approval';
          const isInProgress = firstIncompleteIndex === index && !isPendingAdmin;

          // Connectors
          const renderConnector = () => {
            if (index === 0) return null;
            const prevCompleted = steps[index - 1]?.status === 'completed';
            const isActive = isCompleted || (isInProgress && prevCompleted) || (isPendingAdmin && prevCompleted);
            
            return (
              <div 
                className={`absolute right-1/2 top-[24px] h-[2px] -z-[1] w-full origin-right transition-all duration-1000
                ${isActive ? 'bg-blue-500' : 'bg-transparent'}`} 
              />
            );
          };

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 px-2 group">
              {renderConnector()}
              
              {/* node */}
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 relative
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 
                    isInProgress ? 'bg-white text-blue-600 border-2 border-blue-500 shadow-xl shadow-blue-100 ring-8 ring-blue-50' : 
                    isPendingAdmin ? 'bg-amber-100 text-amber-600 border-2 border-amber-400 animate-pulse' :
                    'bg-white text-gray-300 border-2 border-gray-100'}`}
              >
                {isCompleted ? (
                  <Check size={22} strokeWidth={3} className="drop-shadow-sm" />
                ) : (
                  <span className={isInProgress ? 'scale-110' : ''}>{index + 1}</span>
                )}
                
                {/* Status Dot for mobile or subtle hint */}
                {isInProgress && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                  </span>
                )}
              </div>

              {/* Labels */}
              <div className="mt-5 flex flex-col items-center gap-1">
                <span className={`text-[11px] font-bold text-center uppercase tracking-widest max-w-[110px] leading-snug transition-colors duration-300
                  ${isCompleted ? 'text-emerald-700' : 
                    isInProgress ? 'text-blue-700' : 
                    isPendingAdmin ? 'text-amber-700' : 
                    'text-gray-300'}`}>
                  {step.title}
                </span>
                
                {/* Progress Mini Status */}
                {isInProgress && (
                  <span className="text-[9px] font-bold text-blue-500/60 uppercase tracking-tighter">Em Foco</span>
                )}
                {isPendingAdmin && (
                  <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter">Em Análise</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
