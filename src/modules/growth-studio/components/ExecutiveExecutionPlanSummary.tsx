import React from 'react';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import { Play } from 'lucide-react';
import { ExecutionReadinessIndicator } from './ExecutionReadinessIndicator';
import { NextRecommendedActionCard } from './NextRecommendedActionCard';
import { ExecutiveExecutionPlanCard } from './ExecutiveExecutionPlanCard';
import { ExecutionTimeline } from './ExecutionTimeline';
import { ExecutionRisksCard } from './ExecutionRisksCard';

interface ExecutiveExecutionPlanSummaryProps {
  plan: ExecutiveExecutionPlan | null;
}

export const ExecutiveExecutionPlanSummary: React.FC<ExecutiveExecutionPlanSummaryProps> = ({ plan }) => {
  if (!plan) return null;

  return (
    <article className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-[#0d1117] p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Play size={120} className="text-emerald-500" />
      </div>

      <header className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Play size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Executive Execution Plan™</h2>
            <p className="text-sm font-medium text-emerald-400/80">Plan de ejecución accionable</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 relative z-10">
        <div className="lg:col-span-2 space-y-6">
          <ExecutionReadinessIndicator 
            score={plan.executionReadiness} 
            reason={plan.executionReadinessReason} 
            isBlocked={plan.isBlocked} 
          />
          <NextRecommendedActionCard action={plan.nextRecommendedAction} />
          <ExecutiveExecutionPlanCard plan={plan} />
        </div>
        
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-bold text-white mb-6">Timeline Estratégico</h3>
            <ExecutionTimeline phases={plan.strategicPhases} />
          </div>
          <ExecutionRisksCard risks={plan.executionRisks} missingDependencies={plan.missingDependencies} />
        </div>
      </div>
    </article>
  );
};
