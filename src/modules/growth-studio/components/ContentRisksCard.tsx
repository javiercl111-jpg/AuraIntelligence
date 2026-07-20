import React from 'react';
import type { ContentRisk } from '../types/contentPlan';

interface ContentRisksCardProps {
  risks: ContentRisk[];
}

export const ContentRisksCard: React.FC<ContentRisksCardProps> = ({ risks }) => {
  if (risks.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6">
      <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Riesgos de Producción (Content Risks)
      </h3>
      <div className="space-y-2">
        {risks.map(risk => (
          <div key={risk.id} className="bg-white p-3 rounded-lg border border-red-100 flex gap-3">
            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${risk.severity === 'critical' ? 'bg-red-600' : 'bg-red-400'}`} />
            <div>
              <p className="text-sm text-slate-800 font-medium">{risk.description}</p>
              <div className="flex gap-3 mt-1 text-[11px] text-slate-500 uppercase font-semibold">
                <span>Severidad: {risk.severity}</span>
                <span>Estado: {risk.mitigationStatus}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
