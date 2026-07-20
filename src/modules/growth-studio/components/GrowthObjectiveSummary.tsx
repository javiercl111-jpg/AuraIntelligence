// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Objective Summary
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { GrowthObjective } from '../types/growthObjective';
import CompletionIndicator from './CompletionIndicator';
import GrowthObjectiveCard from './GrowthObjectiveCard';

interface GrowthObjectiveSummaryProps {
  objective: GrowthObjective;
}

export const GrowthObjectiveSummary: React.FC<GrowthObjectiveSummaryProps> = ({ objective }) => {
  const hasErrors = (objective.validationErrors?.length || 0) > 0;

  return (
    <div className="w-full max-w-2xl mx-auto my-6 p-1 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-teal-900/20 to-[#0d1117]">
      <div className="bg-[#0d1117] rounded-xl p-6 h-full flex flex-col gap-6">
        <div className="flex justify-between items-start border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-black text-white tracking-wide">Growth Objective</h3>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/70">
                Estado: {objective.status}
              </span>
              {hasErrors && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  Bloqueado: Faltan datos críticos
                </span>
              )}
            </div>
          </div>
          <CompletionIndicator percentage={objective.completionPercentage || 0} />
        </div>

        <GrowthObjectiveCard objective={objective} />
      </div>
    </div>
  );
};

export default GrowthObjectiveSummary;
