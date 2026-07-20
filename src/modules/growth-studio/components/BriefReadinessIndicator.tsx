import React from 'react';
import type { ExecutiveContentBrief } from '../types/executiveContentBrief';

interface BriefReadinessIndicatorProps {
  brief: ExecutiveContentBrief;
}

export const BriefReadinessIndicator: React.FC<BriefReadinessIndicatorProps> = ({ brief }) => {
  const score = brief.briefReadiness;

  let color = 'text-green-600';
  let bg = 'bg-green-50';
  let border = 'border-green-200';

  if (score < 50) {
    color = 'text-red-600';
    bg = 'bg-red-50';
    border = 'border-red-200';
  } else if (score < 100) {
    color = 'text-amber-600';
    bg = 'bg-amber-50';
    border = 'border-amber-200';
  }

  if (brief.isBlocked) {
    color = 'text-red-600';
    bg = 'bg-red-50';
    border = 'border-red-200';
  }

  return (
    <div className={`p-4 rounded-xl border ${bg} ${border} mb-6`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-sm font-semibold ${color}`}>Brief Readiness</h3>
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
      <p className={`text-xs ${color} opacity-80`}>
        {brief.briefReadinessReason}
      </p>

      {brief.blockingReasons.length > 0 && (
        <div className="mt-3 space-y-2">
          {brief.blockingReasons.map(br => (
            <div key={br.id} className="flex items-start gap-2 text-xs text-red-700 bg-red-100 p-2 rounded">
              <span className="font-bold">Bloqueo:</span>
              <span>{br.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
