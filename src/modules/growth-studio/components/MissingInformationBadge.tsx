// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Missing Information Badge
// ─────────────────────────────────────────────────────────────

import React from 'react';

interface MissingInformationBadgeProps {
  label: string;
}

export const MissingInformationBadge: React.FC<MissingInformationBadgeProps> = ({ label }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Falta {label}
    </span>
  );
};

export default MissingInformationBadge;
