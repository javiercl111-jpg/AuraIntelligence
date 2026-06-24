import React, { useMemo, useState } from 'react';
import { ExternalLink, Send, X } from 'lucide-react';

import AuraPreparedActionCard from './AuraPreparedActionCard';

import { askAuraIntelligence } from '../services/auraIntelligenceEngine';
import { executeAuraHCMNavigation } from '../services/auraHCMNavigationService';
import { executeAuraNavigation } from '../services/auraNavigationEngine';
import { executeAuraMaintenanceNavigation } from '../services/auraMaintenanceNavigationService';

import type {
  AuraAskResponse,
  AuraAskSource,
  AuraIntelligenceContext,
} from '../types/auraIntelligence';

import type {
  AuraSuggestedAction,
} from '../types/auraAction';

import type {
  AuraPreparedAction,
} from '../types/auraPreparedAction';

type LocalMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidence?: AuraAskResponse['confidence'];
  confidenceScore?: number;
  sources?: AuraAskSource[];
  relatedArticles?: AuraAskSource[];
  suggestedActions?: AuraSuggestedAction[];
  preparedAction?: AuraPreparedAction | null;
};

type AuraAssistantWidgetProps = {
  context: AuraIntelligenceContext;
};

const AURA_LOGO_SRC = '/android-chrome-192x192.png';

const createMessageId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const buildAssistantIntro = (context: AuraIntelligenceContext): string => {
  const systemLabel =
    context.system === 'aura_hcm'
      ? 'Aura HCM'
      : context.system === 'aura_maintenance'
        ? 'Aura Maintenance OS'
        : context.system === 'aura_signature'
          ? 'Aura Signature'
          : 'Aura';

  return `Bienvenido a Aura Intelligence.

Soy el Enterprise Copilot del ecosistema Aura.

Puedo ayudarte con ${systemLabel}, Aura Maintenance OS, Aura Signature y los módulos conectados.`;
};

const getConfidenceLabel = (
  confidence?: AuraAskResponse['confidence']
): string => {
  if (confidence === 'high') return 'Alta';
  if (confidence === 'medium') return 'Media';
  if (confidence === 'low') return 'Baja';

  return 'Sin evaluar';
};

const handleSuggestedAction = (
  action: AuraSuggestedAction
) => {
  if (!action.route) return;

  if (action.system === 'aura_hcm') {
    executeAuraHCMNavigation(action as any);
    return;
  }

  if (action.system === 'aura_maintenance') {
    executeAuraMaintenanceNavigation(action as any);
    return;
  }

  executeAuraNavigation(action as any);
};

const AuraAssistantWidget: React.FC<AuraAssistantWidgetProps> = ({
  context,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const introMessage = useMemo(() => buildAssistantIntro(context), [context]);

  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      content: introMessage,
      preparedAction: null,
    },
  ]);

  const sendQuestion = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || isThinking) return;

    const userMessage: LocalMessage = {
      id: createMessageId(),
      role: 'user',
      content: cleanQuestion,
      preparedAction: null,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setIsThinking(true);

    try {
      const response: AuraAskResponse = await askAuraIntelligence({
        question: cleanQuestion,
        context,
      });

      const assistantMessage: LocalMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: response.answer,
        confidence: response.confidence,
        confidenceScore: response.confidenceScore,
        sources: response.sources || [],
        relatedArticles: response.relatedArticles || [],
        suggestedActions: response.suggestedActions || [],
        preparedAction: response.preparedAction || null,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content:
            'No pude procesar tu pregunta en este momento. Intenta de nuevo.',
          confidence: 'low',
          confidenceScore: 0,
          sources: [],
          relatedArticles: [],
          suggestedActions: [],
          preparedAction: null,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-blue-950/40 transition hover:from-cyan-400 hover:to-blue-500"
        >
          <img
            src={AURA_LOGO_SRC}
            alt="Aura Intelligence"
            className="h-6 w-6 rounded-full object-contain"
          />
          Aura Intelligence
        </button>
      )}

      {isOpen && (
        <section className="fixed bottom-5 right-5 z-50 flex h-[600px] w-[410px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#0d1117] text-white shadow-2xl shadow-cyan-950/30">
          <header className="flex items-center justify-between border-b border-cyan-300/10 bg-white/[0.045] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-[#101923] shadow-lg shadow-cyan-950/30">
                <img
                  src={AURA_LOGO_SRC}
                  alt="Aura Intelligence"
                  className="h-8 w-8 rounded-lg object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-black">
                  Aura Intelligence
                </p>
                <p className="text-xs font-semibold text-cyan-100/60">
                  Enterprise Copilot
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar Aura Intelligence"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'mr-8 bg-white/10 text-white/90'
                }`}
              >
                <p>{message.content}</p>

                {message.role === 'assistant' && message.id !== 'intro' && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {message.preparedAction && (
                      <AuraPreparedActionCard
                        action={message.preparedAction}
                        context={context}
                      />
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        Confianza: {getConfidenceLabel(message.confidence)}
                        {typeof message.confidenceScore === 'number'
                          ? ` · ${message.confidenceScore}%`
                          : ''}
                      </span>
                    </div>

                    {!!message.suggestedActions?.length && (
                      <div className="mt-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">
                          Acciones sugeridas
                        </p>

                        <div className="mt-2 space-y-2">
                          {message.suggestedActions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => handleSuggestedAction(action)}
                              className="flex w-full items-start justify-between gap-2 rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-left text-[11px] text-cyan-50 transition hover:bg-cyan-500/20"
                            >
                              <span>
                                <span className="block font-bold">
                                  {action.label}
                                </span>
                                <span className="mt-1 block text-cyan-100/60">
                                  {action.description}
                                </span>
                              </span>

                              <ExternalLink
                                size={13}
                                className="mt-0.5 shrink-0"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!!message.sources?.length && (
                      <div className="mt-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200">
                          Fuentes usadas
                        </p>

                        <div className="mt-2 space-y-1">
                          {message.sources.map((source) => (
                            <div
                              key={source.articleId}
                              className="rounded-lg bg-black/20 px-3 py-2 text-[11px] text-white/65"
                            >
                              {source.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!!message.relatedArticles?.length && (
                      <div className="mt-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                          Relacionados
                        </p>

                        <div className="mt-2 space-y-1">
                          {message.relatedArticles.map((source) => (
                            <div
                              key={source.articleId}
                              className="rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/50"
                            >
                              {source.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="mr-8 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                Aura Intelligence está revisando la base de conocimiento y conectores...
              </div>
            )}
          </div>

          <footer className="border-t border-cyan-300/10 p-3">
            <div className="flex items-center gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void sendQuestion();
                  }
                }}
                placeholder="Pregúntale a Aura..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-300"
              />

              <button
                type="button"
                onClick={() => void sendQuestion()}
                disabled={isThinking || !question.trim()}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-3 text-white shadow-lg shadow-blue-950/30 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Enviar pregunta"
              >
                <Send size={18} />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-white/40">
              Aura Intelligence · Enterprise Copilot · Knowledge + Connectors + Actions
            </p>
          </footer>
        </section>
      )}
    </>
  );
};

export default AuraAssistantWidget;