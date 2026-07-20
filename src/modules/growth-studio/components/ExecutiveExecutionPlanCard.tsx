import React from 'react';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import { Target, BarChart2, Hash } from 'lucide-react';

interface ExecutiveExecutionPlanCardProps {
  plan: ExecutiveExecutionPlan;
}

export const ExecutiveExecutionPlanCard: React.FC<ExecutiveExecutionPlanCardProps> = ({ plan }) => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
            <Target size={16} /> Objetivo de Ejecución
          </h4>
          <p className="text-white font-medium">
            {plan.executionGoal.value || 'No definido'}
          </p>
          <span className="text-xs text-white/50">{plan.executionGoal.status}</span>
        </div>
        
        <div className="h-px bg-white/10" />
        
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
            <BarChart2 size={16} /> Justificación de Negocio
          </h4>
          <p className="text-white font-medium">
            {plan.businessJustification.value || 'No definida'}
          </p>
          <span className="text-xs text-white/50">{plan.businessJustification.status}</span>
        </div>

        <div className="h-px bg-white/10" />
        
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-2">
            <Hash size={16} /> Prioridades Ejecutivas (Canales)
          </h4>
          {plan.executivePriorities.value && plan.executivePriorities.value.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {plan.executivePriorities.value.map((priority, i) => (
                <span key={i} className="px-2 py-1 rounded-md bg-white/10 text-xs font-medium text-white">
                  {priority}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-sm">No definidas</p>
          )}
          <span className="text-xs text-white/50 mt-2 block">{plan.executivePriorities.status}</span>
        </div>
      </div>
    </div>
  );
};
