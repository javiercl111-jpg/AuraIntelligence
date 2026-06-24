import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
} from 'lucide-react';

import {
  createAuraCopilotDraft,
} from '../services/auraCopilotExecutionService';

import type {
  AuraPreparedAction,
} from '../types/auraPreparedAction';
import type { AuraIntelligenceContext } from '../types/auraIntelligence';

type AuraPreparedActionCardProps = {
  action: AuraPreparedAction;
  context?: AuraIntelligenceContext;
};

const AuraPreparedActionCard: React.FC<AuraPreparedActionCardProps> = ({
  action,
  context,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  const handleCreateDraft = async () => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      const result = await createAuraCopilotDraft({
        tenantId: context?.tenantId || 'aura_demo',
        companyId: context?.companyId || 'aura_demo',
        userId: context?.userId || 'copilot_user',
        userEmail: context?.userEmail || undefined,
        role: context?.role || 'unknown_role',
        module: context?.module || 'general',
        preparedAction: action,
        mode: 'draft_only',
      });

      setDraftMessage(result.message);
    } catch (error) {
      console.error(error);

      setDraftMessage(
        'No fue posible crear el borrador.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-200">
          <ClipboardList size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">
            Acción preparada
          </p>

          <h4 className="mt-1 text-sm font-black text-white">
            {action.title}
          </h4>

          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {action.description}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {action.fields.map((field) => (
          <div
            key={field.key}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white/75">
                {field.label}
              </span>

              {field.required && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/70">
                  Requerido
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-white/40">
              {field.value
                ? String(field.value)
                : 'Pendiente de completar'}
            </p>
          </div>
        ))}
      </div>

      {draftMessage && (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
          {draftMessage}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <span className="text-[11px] text-white/45">
          Confianza:{' '}
          {Math.round(action.confidence * 100)}%
        </span>

        <button
          type="button"
          onClick={() => void handleCreateDraft()}
          disabled={isCreating}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-[11px] font-bold text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <CheckCircle2 size={14} />
          )}

          {isCreating
            ? 'Creando...'
            : 'Crear borrador'}
        </button>
      </div>
    </div>
  );
};

export default AuraPreparedActionCard;