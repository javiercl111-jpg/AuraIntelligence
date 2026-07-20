// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Knowledge Gap Card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { KnowledgeGap } from '../types/brandBrain';

interface KnowledgeGapCardProps {
  gaps: KnowledgeGap[];
  title?: string;
  description?: string;
}

export const KnowledgeGapCard: React.FC<KnowledgeGapCardProps> = ({
  gaps,
  title = "Vacíos de Conocimiento",
  description = "Los siguientes campos no han podido ser inferidos. Su ausencia afectará la precisión de los insights generados."
}) => {
  if (gaps.length === 0) return null;

  return (
    <div className="w-full bg-[#161b22] border border-red-500/20 rounded-xl p-6 shadow-inner">
      <h4 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
        <span>⚠️</span> {title}
      </h4>
      <p className="text-xs text-white/60 mb-4">
        {description}
      </p>
      <div className="flex flex-wrap gap-2">
        {gaps.map((gap, index) => (
          <span
            key={index}
            className="text-[11px] font-medium px-2.5 py-1 rounded-md border bg-red-500/10 text-red-400 border-red-500/30"
          >
            {gap.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeGapCard;
