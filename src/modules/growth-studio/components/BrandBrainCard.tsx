// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Brand Brain Card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { BrandBrain, BrandBrainField } from '../types/brandBrain';

interface BrandBrainCardProps {
  brain: BrandBrain;
}

const FieldRow = ({ label, field }: { label: string; field?: BrandBrainField<unknown> }) => {
  if (!field) return null;
  const isMissing = field.status === 'missing';

  const displayValue = Array.isArray(field.value)
    ? field.value.join(', ')
    : String(field.value || '');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400/70">{label}</span>
        {isMissing ? (
          <span className="text-sm text-white/30 italic">No especificado</span>
        ) : (
          <span className="text-sm font-medium text-white">{displayValue}</span>
        )}
      </div>
      <div>
        {isMissing ? (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/20">
            Falta Info
          </span>
        ) : (
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border flex flex-col items-end gap-1 ${
            field.status === 'confirmed'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {field.status}
            {field.source && <span className="text-[8px] opacity-70">Source: {field.source}</span>}
          </span>
        )}
      </div>
    </div>
  );
};

export const BrandBrainCard: React.FC<BrandBrainCardProps> = ({ brain }) => {
  return (
    <div className="w-full bg-[#161b22] border border-white/10 rounded-xl p-6 shadow-inner">
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-blue-400">🧠</span> Identidad de Marca (Brand Brain)
      </h4>
      <div className="flex flex-col">
        <FieldRow label="Empresa" field={brain.companyProfile.companyName} />
        <FieldRow label="Descripción" field={brain.companyProfile.businessDescription} />
        <FieldRow label="Industria" field={brain.industry} />
        <FieldRow label="Productos/Servicios" field={brain.products} />
        <FieldRow label="Propuesta de Valor" field={brain.valueProposition} />
        <FieldRow label="Audiencia Objetivo" field={brain.targetAudience} />
        <FieldRow label="Tono de Marca" field={brain.brandTone} />
        <FieldRow label="Diferenciadores" field={brain.differentiators} />
        <FieldRow label="Estilo de Comunicación" field={brain.communicationStyle} />
        <FieldRow label="Metas de Negocio" field={brain.businessGoals} />
      </div>
    </div>
  );
};

export default BrandBrainCard;
