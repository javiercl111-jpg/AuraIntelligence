import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { ClipboardList } from 'lucide-react';

import { db } from '../firebase';

import type {
  AuraPreparedAction,
} from '../types/auraPreparedAction';

type AuraCopilotDraft = {
  id: string;
  title: string;
  system: string;
  actionType: string;
  status: string;
  createdAt?: string;
  preparedAction?: AuraPreparedAction;
};

const AuraCopilotDraftsPanel: React.FC = () => {
  const [drafts, setDrafts] = useState<AuraCopilotDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDrafts = async () => {
    setIsLoading(true);

    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'ai_copilot_drafts'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
      );

      setDrafts(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<AuraCopilotDraft, 'id'>),
        }))
      );
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error loading copilot drafts:',
        error
      );

      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDrafts();
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Aura Copilot
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Borradores de acciones
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Borradores creados por Aura Intelligence en modo seguro. Ninguna
            acción se ejecuta automáticamente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDrafts()}
          className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/10"
        >
          Actualizar
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
            Cargando borradores...
          </div>
        )}

        {!isLoading && drafts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
            Aún no hay borradores de Copilot.
          </div>
        )}

        {!isLoading &&
          drafts.map((draft) => (
            <article
              key={draft.id}
              className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-200">
                  <ClipboardList size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      {draft.title || 'Borrador sin título'}
                    </h3>

                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-100/70">
                      {draft.status || 'draft'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-white/55">
                    {draft.system} · {draft.actionType}
                  </p>

                  {draft.createdAt && (
                    <p className="mt-1 text-[11px] text-white/35">
                      Creado: {new Date(draft.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {!!draft.preparedAction?.fields?.length && (
                <div className="mt-3 grid gap-2">
                  {draft.preparedAction.fields.map((field) => (
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
              )}
            </article>
          ))}
      </div>
    </section>
  );
};

export default AuraCopilotDraftsPanel;