import React from 'react';
import type { ContentPlan } from '../types/contentPlan';

interface ContentReadinessIndicatorProps {
  plan: ContentPlan;
}

export const ContentReadinessIndicator: React.FC<ContentReadinessIndicatorProps> = ({ plan }) => {
  const score = plan.contentReadiness;

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

  if (plan.isBlocked) {
    color = 'text-red-600';
    bg = 'bg-red-50';
    border = 'border-red-200';
  }

  return (
    <div className={`p-4 rounded-xl border ${bg} ${border} mb-6`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-sm font-semibold ${color}`}>Content Readiness</h3>
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
      <p className={`text-xs ${color} opacity-80`}>
        {plan.contentReadinessReason}
      </p>
    </div>
  );
};
