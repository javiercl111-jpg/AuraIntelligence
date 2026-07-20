// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Executive Proposal Card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { GrowthStructuredContext } from '../types/growthConversation';

interface ExecutiveProposalCardProps {
  context: GrowthStructuredContext;
}

export const ExecutiveProposalCard: React.FC<ExecutiveProposalCardProps> = ({ context }) => {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 p-8 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/60 to-black shadow-2xl shadow-emerald-900/20">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-full">
          Propuesta preliminar de demostración
        </span>
        <h2 className="text-2xl font-black text-white">Plan de Crecimiento Ejecutivo</h2>
      </div>

      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h4 className="text-sm font-semibold text-emerald-300 mb-2">Estrategia Central</h4>
          <p className="text-sm text-emerald-50/80 leading-relaxed">
            Basado en tu objetivo de <strong>{context.objective || 'N/A'}</strong>, proponemos una campaña focalizada en <strong>{context.audience || 'N/A'}</strong> dentro de <strong>{context.region || 'N/A'}</strong>.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h4 className="text-sm font-semibold text-emerald-300 mb-2">Enfoque de Ejecución</h4>
          <p className="text-sm text-emerald-50/80 leading-relaxed">
            Se priorizará un mensaje de autoridad y confianza, buscando lograr <strong>{context.expectedResult || 'N/A'}</strong>. Esta es una propuesta simulada sin IA real, diseñada para validar la fundación de Aura Growth Studio™.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveProposalCard;
