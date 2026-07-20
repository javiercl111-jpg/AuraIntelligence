// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Executive Reflection Card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { GrowthStructuredContext } from '../types/growthConversation';

interface ExecutiveReflectionCardProps {
  context: GrowthStructuredContext;
}

export const ExecutiveReflectionCard: React.FC<ExecutiveReflectionCardProps> = ({ context }) => {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 p-6 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 to-teal-900/30 shadow-xl shadow-black/40">
      <div className="flex items-center gap-3 mb-4 border-b border-emerald-500/20 pb-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <span className="text-emerald-400 font-bold text-sm">💡</span>
        </div>
        <h3 className="text-lg font-semibold text-white tracking-wide">Reflexión Estratégica</h3>
      </div>

      <div className="space-y-4">
        {context.objective && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/70 mb-1">Objetivo</p>
            <p className="text-emerald-50 text-sm">{context.objective}</p>
          </div>
        )}

        {context.audience && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/70 mb-1">Audiencia</p>
            <p className="text-emerald-50 text-sm">{context.audience}</p>
          </div>
        )}

        {context.region && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/70 mb-1">Región</p>
            <p className="text-emerald-50 text-sm">{context.region}</p>
          </div>
        )}

        {context.expectedResult && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/70 mb-1">Resultado Esperado</p>
            <p className="text-emerald-50 text-sm">{context.expectedResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveReflectionCard;
