import React from 'react';
import type { ExecutionRisk, ExecutionDependency } from '../types/executiveExecutionPlan';
import { AlertTriangle, AlertCircle, Link } from 'lucide-react';

interface ExecutionRisksCardProps {
  risks: ExecutionRisk[];
  missingDependencies: ExecutionDependency[];
}

export const ExecutionRisksCard: React.FC<ExecutionRisksCardProps> = ({ risks, missingDependencies }) => {
  if (risks.length === 0 && missingDependencies.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
      {missingDependencies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link className="text-orange-400" size={18} />
            <h3 className="font-bold text-white">Dependencias Faltantes ({missingDependencies.length})</h3>
          </div>
          <div className="space-y-3">
            {missingDependencies.map(dep => (
              <div key={dep.id} className="rounded-lg bg-white/5 p-3 flex gap-3 items-start border-l-2 border-orange-400">
                <AlertCircle className="text-orange-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-sm text-white font-medium">{dep.description}</p>
                  <p className="text-xs text-white/50 mt-1">Requerido para: <span className="capitalize">{dep.requiredForPhase.replace('_', ' ')}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-400" size={18} />
            <h3 className="font-bold text-white">Riesgos de Ejecución ({risks.length})</h3>
          </div>
          <div className="space-y-3">
            {risks.map(risk => (
              <div key={risk.id} className="rounded-lg bg-white/5 p-3 flex gap-3 items-start border-l-2 border-red-400">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-sm text-white font-medium">{risk.description}</p>
                  <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">{risk.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
