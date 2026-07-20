import React from 'react';

/**
 * GrowthStudioEntry — Minimal visual entry point for Aura Growth Studio™.
 *
 * This component renders ONLY the module identity card:
 * - Product name
 * - Subtitle
 * - Edition
 * - Foundation status
 *
 * It contains NO forms, chatbot, navigation, buttons, or Firebase writes.
 * It follows the existing dark enterprise design language.
 */
const GrowthStudioEntry: React.FC = () => {
  return (
    <article
      id="growth-studio-entry"
      className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/40 via-[#0d1117] to-teal-950/30 p-8"
    >
      {/* Subtle gradient glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)',
        }}
      />

      {/* Module badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Launch Edition
        </span>
      </div>

      {/* Product identity */}
      <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
        Aura Growth Studio™
      </h2>

      <p className="mt-2 text-sm font-medium tracking-wide text-emerald-200/70">
        AI Growth Operating System
      </p>

      {/* Foundation status */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">
          Foundation in progress
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-emerald-400/30 to-transparent" />
      </div>
    </article>
  );
};

export default GrowthStudioEntry;
