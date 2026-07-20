import React from 'react';
import type { Constraint } from '../types/executiveContentBrief';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface ConstraintCardProps {
  constraints: Constraint[];
}

export const ConstraintCard: React.FC<ConstraintCardProps> = ({ constraints }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-slate-500" />
        Restricciones Ejecutivas
      </h3>

      {constraints.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No hay restricciones definidas.</p>
      ) : (
        <div className="grid gap-3">
          {constraints.map(c => (
            <div key={c.id} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-700">{c.description}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">{c.type}</span>
                  <span className="text-[10px] text-slate-400">Origen: {c.source === 'aura_governance' ? 'Reglas Institucionales de Aura' : c.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
