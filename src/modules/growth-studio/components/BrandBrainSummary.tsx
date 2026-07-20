// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Brand Brain Summary
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { BrandBrain } from '../types/brandBrain';
import ConfidenceIndicator from './ConfidenceIndicator';
import BrandBrainCard from './BrandBrainCard';
import KnowledgeGapCard from './KnowledgeGapCard';

interface BrandBrainSummaryProps {
  brain: BrandBrain;
}

export const BrandBrainSummary: React.FC<BrandBrainSummaryProps> = ({ brain }) => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-blue-500">🧬</span> Memoria de Identidad
        </h3>
        <p className="text-sm text-white/60 leading-relaxed -mt-2">
          Este es el conocimiento que Aura ha recopilado sobre tu marca basándose en nuestra conversación y en la información proporcionada.
        </p>

        <ConfidenceIndicator score={brain.confidenceScore} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <BrandBrainCard brain={brain} />
          {brain.missingKnowledge && brain.missingKnowledge.length > 0 && (
            <KnowledgeGapCard gaps={brain.missingKnowledge} />
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandBrainSummary;
