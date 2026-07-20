import React from 'react';
import type { Assumption } from '../types/campaignStrategy';

interface AssumptionsCardProps {
  assumptions: Assumption[];
}

export const AssumptionsCard: React.FC<AssumptionsCardProps> = ({ assumptions }) => {
  if (!assumptions || assumptions.length === 0) return null;

  return (
    <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🧠</span>
        <h3 className="text-xl font-bold text-purple-900 tracking-tight">Supuestos Estratégicos</h3>
      </div>
      <p className="text-sm text-purple-700 opacity-90">
        Información inferida por Aura que carece de validación explícita, pero permite avanzar con el diseño preliminar.
      </p>
      <div className="grid gap-3">
        {assumptions.map((assump, idx) => (
          <div key={idx} className="bg-white p-3 rounded-xl border border-purple-200 flex flex-col gap-1">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">{assump.field}</span>
            <p className="text-sm text-gray-800">{assump.statement}</p>
            <span className="text-xs text-purple-500 italic">Confianza: {assump.confidence}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssumptionsCard;
