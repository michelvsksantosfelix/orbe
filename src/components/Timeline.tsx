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
    <div className="w-full py-2 sm:py-6 overflow-x-auto hide-scrollbar">
      <div className="flex items-center justify-between w-full relative min-w-[500px]">
        {/* Background line */}
        <div className="absolute left-[20px] right-[20px] top-[20px] h-[3px] bg-slate-200 z-0"></div>
        
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isPendingAdmin = step.status === 'pending_admin_approval';
          // Follow same dynamic logic
          const isInProgress = firstIncompleteIndex === index && !isPendingAdmin;
          const isFuture = !isCompleted && !isPendingAdmin && !isInProgress;

          const progressLineStyle = () => {
            if (index === 0) return null; // No line before first item handled by outer wrapper or we can explicitly color it
            // If the step to the left is completed, the line is colored
            const prevCompleted = steps[index - 1]?.status === 'completed';
            return (
              <div 
                className={`absolute right-1/2 top-[20px] h-[3px] -z-[1] w-full origin-left transition-all duration-700
                ${isCompleted || prevCompleted ? 'bg-emerald-500' : 'bg-transparent'}`} 
              />
            );
          };

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
              {progressLineStyle()}
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 shadow-sm
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-200' : 
                    isInProgress ? 'bg-blue-600 text-white shadow-blue-200 outline outline-4 outline-blue-100 outline-offset-0' : 
                    isPendingAdmin ? 'bg-amber-400 text-white shadow-amber-200 animate-pulse' :
                    'bg-slate-100 text-slate-400 border-2 border-slate-200'}`}
                title={isPendingAdmin ? 'Aguardando validação do Admin' : ''}
              >
                {isCompleted ? <Check size={20} strokeWidth={3} /> : index + 1}
              </div>
              <span className={`mt-4 text-xs font-semibold text-center uppercase tracking-wider max-w-[100px] leading-tight
                ${isCompleted ? 'text-emerald-800' : 
                  isInProgress ? 'text-blue-900' : 
                  isPendingAdmin ? 'text-amber-800' : 
                  'text-slate-400'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
