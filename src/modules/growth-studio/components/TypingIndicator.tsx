// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Typing Indicator
// ─────────────────────────────────────────────────────────────

import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex gap-1 items-center p-3 w-fit rounded-2xl bg-emerald-950/20 border border-emerald-400/10">
      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
};

export default TypingIndicator;
