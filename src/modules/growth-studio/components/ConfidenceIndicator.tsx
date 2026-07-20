// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Confidence Indicator
// ─────────────────────────────────────────────────────────────

import React from 'react';

interface ConfidenceIndicatorProps {
  score: number;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ score }) => {
  // Determine color based on score
  let colorClass = 'text-red-400';
  let barColorClass = 'bg-red-400';
  if (score >= 80) {
    colorClass = 'text-emerald-400';
    barColorClass = 'bg-emerald-400';
  } else if (score >= 50) {
    colorClass = 'text-amber-400';
    barColorClass = 'bg-amber-400';
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Nivel de conocimiento de marca
        </span>
        <span className={`text-2xl font-bold ${colorClass}`}>
          {score}%
        </span>
      </div>
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColorClass} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

export default ConfidenceIndicator;
