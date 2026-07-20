import React from 'react';
import type { ExecutionAction } from '../types/executiveExecutionPlan';
import { ArrowRight, AlertTriangle, PlayCircle, CheckSquare } from 'lucide-react';

interface NextRecommendedActionCardProps {
  action: ExecutionAction | null;
}

export const NextRecommendedActionCard: React.FC<NextRecommendedActionCardProps> = ({ action }) => {
  if (!action) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <CheckSquare className="mx-auto mb-3 text-emerald-400" size={24} />
        <h3 className="text-lg font-bold text-white">Plan de ejecución completo</h3>
        <p className="text-sm text-white/60">No hay acciones pendientes recomendadas en este momento.</p>
      </div>
    );
  }

  const isCritical = action.priority === 'critical';

  return (
    <div className={`rounded-xl border ${isCritical ? 'border-red-500/30 bg-red-500/10' : 'border-blue-500/30 bg-blue-500/10'} p-6 relative overflow-hidden`}>
      <div className="flex items-center gap-2 mb-2">
        {isCritical ? (
          <AlertTriangle className="text-red-400" size={16} />
        ) : (
          <PlayCircle className="text-blue-400" size={16} />
        )}
        <span className={`text-xs font-bold uppercase tracking-wider ${isCritical ? 'text-red-300' : 'text-blue-300'}`}>
          Siguiente Acción Recomendada
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
      <p className="text-sm text-white/70 mb-4 capitalize">Fase: {action.phase.replace('_', ' ')}</p>
      
      <button className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white transition ${isCritical ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
        Ejecutar <ArrowRight size={16} />
      </button>
    </div>
  );
};
