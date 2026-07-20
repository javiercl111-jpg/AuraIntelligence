// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Completion Indicator
// ─────────────────────────────────────────────────────────────

import React from 'react';

interface CompletionIndicatorProps {
  percentage: number;
}

export const CompletionIndicator: React.FC<CompletionIndicatorProps> = ({ percentage }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-emerald-900/40"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-emerald-400 transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-xs font-bold text-white">{percentage}%</span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Completitud MVP
        </p>
        <p className="text-xs text-emerald-100/60">
          {percentage >= 100 ? 'Listo para ejecutar' : 'Requiere más datos'}
        </p>
      </div>
    </div>
  );
};

export default CompletionIndicator;
