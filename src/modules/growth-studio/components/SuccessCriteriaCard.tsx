import React from 'react';
import type { SuccessCriterion, AcceptanceChecklist } from '../types/executiveContentBrief';
import { FileCheck, BadgeCheck } from 'lucide-react';

interface SuccessCriteriaCardProps {
  criteria: SuccessCriterion[];
  checklist: AcceptanceChecklist[];
}

export const SuccessCriteriaCard: React.FC<SuccessCriteriaCardProps> = ({ criteria, checklist }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <FileCheck className="w-4 h-4 text-slate-500" />
        Criterios de Éxito
      </h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Métricas y Criterios Verificables</h4>
          {criteria.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay criterios definidos.</p>
          ) : (
            <ul className="space-y-2">
              {criteria.map(c => (
                <li key={c.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <BadgeCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span>{c.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Checklist de Aceptación</h4>
          {checklist.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay checklist definido.</p>
          ) : (
            <div className="space-y-2">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-md">
                  <input
                    type="checkbox"
                    checked={item.status === 'satisfied'}
                    readOnly
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span className={`text-sm ${item.required ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                    {item.label}
                  </span>
                  {item.required && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full ml-auto">Requerido</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
