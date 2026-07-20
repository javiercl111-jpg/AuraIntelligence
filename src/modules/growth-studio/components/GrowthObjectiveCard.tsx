// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Objective Card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { GrowthObjective } from '../types/growthObjective';
import MissingInformationBadge from './MissingInformationBadge';

interface GrowthObjectiveCardProps {
  objective: GrowthObjective;
}

const FieldRow = ({ label, value, isMissing, status }: { label: string; value?: string; isMissing: boolean; status: string }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70">{label}</span>
        {value ? (
          <span className="text-sm font-medium text-white">{value}</span>
        ) : (
          <span className="text-sm text-white/30 italic">No especificado</span>
        )}
      </div>
      <div>
        {isMissing ? (
          <MissingInformationBadge label={label} />
        ) : (
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
            status === 'confirmed' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
};

export const GrowthObjectiveCard: React.FC<GrowthObjectiveCardProps> = ({ objective }) => {
  const isMissing = (field: string) => objective.missingFields?.includes(field) ?? false;
  const getStatus = (field: string) => {
    if (isMissing(field)) return 'missing';
    if (objective.confirmedFields?.includes(field)) return 'confirmed';
    return 'inferred';
  };

  return (
    <div className="w-full bg-[#161b22] border border-white/10 rounded-xl p-6 shadow-inner">
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-emerald-400">🎯</span> Estructura del Objetivo
      </h4>
      <div className="flex flex-col">
        <FieldRow label="Meta (Goal)" value={objective.goal} isMissing={isMissing('goal')} status={getStatus('goal')} />
        <FieldRow label="Producto/Servicio" value={objective.productOrService} isMissing={isMissing('productOrService')} status={getStatus('productOrService')} />
        <FieldRow label="Audiencia" value={objective.audience} isMissing={isMissing('audience')} status={getStatus('audience')} />
        <FieldRow label="Resultado Esperado" value={objective.expectedResult} isMissing={isMissing('expectedResult')} status={getStatus('expectedResult')} />
        <FieldRow label="Región" value={objective.region} isMissing={isMissing('region')} status={getStatus('region')} />
        <FieldRow label="Horizonte" value={objective.horizon} isMissing={isMissing('horizon')} status={getStatus('horizon')} />
        <FieldRow label="Presupuesto" value={objective.budget} isMissing={isMissing('budget')} status={getStatus('budget')} />
      </div>
    </div>
  );
};

export default GrowthObjectiveCard;
