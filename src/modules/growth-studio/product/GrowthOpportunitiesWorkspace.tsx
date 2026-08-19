import {
  Building2,
  CircleDollarSign,
  Filter,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';

import { useGrowthI18n } from '../i18n/GrowthI18nProvider';

import {
  evaluateOpportunityIntelligence,
  priorityFromOpportunityScore,
} from '../services/OpportunityIntelligenceEngine';

import type {
  GrowthOpportunity,
  GrowthOpportunitySignal,
  GrowthOpportunityStage,
} from '../types/growthOpportunity';

const formatCurrency = (
  value: number | null,
  currency: string,
): string => {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(
    'es-MX',
    {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    },
  ).format(value);
};
const createSignals = (
  prefix: string,
  fit: number,
  intent: number,
  engagement: number,
  timing: number,
): GrowthOpportunitySignal[] => [
  {
    id: `${prefix}-fit`,
    type: 'fit',
    label: 'Ajuste',
    description:
      'Coincidencia con el perfil comercial objetivo.',
    strength: fit,
    observedAt: '2026-08-18T10:00:00.000Z',
  },
  {
    id: `${prefix}-intent`,
    type: 'intent',
    label: 'Intención',
    description:
      'Señales de interés en la propuesta de valor.',
    strength: intent,
    observedAt: '2026-08-18T10:00:00.000Z',
  },
  {
    id: `${prefix}-engagement`,
    type: 'engagement',
    label: 'Interacción',
    description:
      'Nivel reciente de interacción comercial.',
    strength: engagement,
    observedAt: '2026-08-18T10:00:00.000Z',
  },
  {
    id: `${prefix}-timing`,
    type: 'timing',
    label: 'Momento',
    description:
      'Probabilidad de una ventana de decisión.',
    strength: timing,
    observedAt: '2026-08-18T10:00:00.000Z',
  },
];

const createOpportunity = (
  id: string,
  name: string,
  company: string,
  role: string,
  stage: GrowthOpportunityStage,
  estimatedValue: number,
  source: GrowthOpportunity['source'],
  ownerDisplayName: string,
  signals: GrowthOpportunitySignal[],
): GrowthOpportunity => {
  const intelligence =
    evaluateOpportunityIntelligence({
      signals,
    });

  return {
    id,
    tenantId: 'demo-tenant',
    companyId: `company-${id}`,
    prospect: {
      name,
      company,
      role,
    },
    stage,
    priority:
      priorityFromOpportunityScore(
        intelligence.score,
      ),
    estimatedValue,
    currency: 'MXN',
    ownerUserId: `owner-${id}`,
    ownerDisplayName,
    source,
    sourceChannel:
      source === 'linkedin'
        ? 'linkedin'
        : source === 'email'
          ? 'email'
          : null,
    campaignId: null,
    intelligence,
    expectedCloseAt: null,
    schemaVersion: 1,
    createdAt:
      '2026-08-18T10:00:00.000Z',
    updatedAt:
      '2026-08-18T10:00:00.000Z',
  };
};

const opportunities: GrowthOpportunity[] = [
  createOpportunity(
    'opp-001',
    'Mariana Torres',
    'Grupo Nova',
    'Directora de Operaciones',
    'qualified',
    420000,
    'linkedin',
    'Equipo Comercial',
    createSignals(
      'opp-001',
      96,
      92,
      88,
      90,
    ),
  ),
  createOpportunity(
    'opp-002',
    'Carlos Méndez',
    'Industrias Horizonte',
    'Director General',
    'engaged',
    280000,
    'campaign',
    'Equipo Comercial',
    createSignals(
      'opp-002',
      88,
      78,
      72,
      80,
    ),
  ),
  createOpportunity(
    'opp-003',
    'Andrea Salazar',
    'Logística Delta',
    'Gerente de Capital Humano',
    'discovered',
    190000,
    'referral',
    '',
    createSignals(
      'opp-003',
      82,
      58,
      52,
      64,
    ),
  ),
  createOpportunity(
    'opp-004',
    'Roberto Vega',
    'Manufactura Axis',
    'Director de Transformación',
    'proposal',
    510000,
    'email',
    'Equipo Comercial',
    createSignals(
      'opp-004',
      92,
      86,
      80,
      94,
    ),
  ),
];

export default function GrowthOpportunitiesWorkspace() {
  const { messages } = useGrowthI18n();

  const stageLabels: Record<GrowthOpportunityStage, string> = {
    discovered: messages.stages.discovered,
    qualified: messages.stages.qualified,
    engaged: messages.stages.engaged,
    proposal: messages.stages.proposal,
    negotiation: messages.stages.negotiation,
    won: messages.stages.won,
    lost: messages.stages.lost,
  };

  const localizedSignalLabel = (
    type: GrowthOpportunitySignal['type'],
  ): string => {
    switch (type) {
      case 'fit':
        return messages.opportunities.signalFit;
      case 'intent':
        return messages.opportunities.signalIntent;
      case 'engagement':
        return messages.opportunities.signalEngagement;
      case 'timing':
        return messages.opportunities.signalTiming;
      default:
        return type;
    }
  };

  const localizedPriorityLabel = (
    score: number,
  ): string => {
    switch (priorityFromOpportunityScore(score)) {
      case 'critical':
        return messages.opportunities.priorityCritical;
      case 'high':
        return messages.opportunities.priorityHigh;
      case 'medium':
        return messages.opportunities.priorityMedium;
      case 'low':
      default:
        return messages.opportunities.priorityLow;
    }
  };

  const [query, setQuery] =
    useState('');

  const [stage, setStage] =
    useState<'all' | GrowthOpportunityStage>(
      'all',
    );

  const [selectedId, setSelectedId] =
    useState(opportunities[0].id);

  const visibleOpportunities =
    useMemo(
      () =>
        opportunities
          .filter((opportunity) => {
            const normalizedQuery =
              query
                .trim()
                .toLowerCase();

            const matchesQuery =
              normalizedQuery.length === 0 ||
              opportunity.prospect.name
                .toLowerCase()
                .includes(normalizedQuery) ||
              opportunity.prospect.company
                .toLowerCase()
                .includes(normalizedQuery);

            const matchesStage =
              stage === 'all' ||
              opportunity.stage === stage;

            return (
              matchesQuery &&
              matchesStage
            );
          })
          .sort(
            (left, right) =>
              right.intelligence.score -
              left.intelligence.score,
          ),
      [query, stage],
    );

  const selected =
    opportunities.find(
      (opportunity) =>
        opportunity.id === selectedId,
    ) ?? opportunities[0];

  const localizedRationale =
    selected.intelligence.signals.length === 0
      ? messages.opportunities.rationaleNoSignals
      : `${messages.opportunities.rationalePrefix} ${
          selected.intelligence.signals.length
        } ${messages.opportunities.rationaleSignals} ${
          localizedPriorityLabel(
            selected.intelligence.score,
          )
        } ${messages.opportunities.rationaleScore} ${
          selected.intelligence.score
        }/100.`;

  const localizedNextBestAction =
    (() => {
      const action =
        selected.intelligence.nextBestAction;

      if (!action) {
        return null;
      }

      switch (action.priority) {
        case 'critical':
          return {
            title:
              messages.opportunities.actionContactNow,
            description:
              messages.opportunities
                .actionContactNowDescription,
          };

        case 'high':
          return {
            title:
              messages.opportunities
                .actionPrepareApproach,
            description:
              messages.opportunities
                .actionPrepareApproachDescription,
          };

        case 'medium':
          return {
            title:
              messages.opportunities.actionNurture,
            description:
              messages.opportunities
                .actionNurtureDescription,
          };

        case 'low':
        default:
          return {
            title:
              messages.opportunities.actionMoreEvidence,
            description:
              messages.opportunities
                .actionMoreEvidenceDescription,
          };
      }
    })();

  const pipelineValue =
    opportunities.reduce(
      (total, opportunity) =>
        total +
        (opportunity.estimatedValue ?? 0),
      0,
    );

  const highPriorityCount =
    opportunities.filter(
      (opportunity) =>
        opportunity.intelligence.score >= 70,
    ).length;

  const averageScore =
    Math.round(
      opportunities.reduce(
        (total, opportunity) =>
          total +
          opportunity.intelligence.score,
        0,
      ) / opportunities.length,
    );

  return (
    <section
      aria-label={messages.opportunities.workspaceLabel}
      className="space-y-6"
    >
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          <Target size={15} />
          {messages.opportunities.intelligenceLabel}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {messages.opportunities.title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {messages.opportunities.description}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <CircleDollarSign
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            {messages.opportunities.pipeline}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatCurrency(
              pipelineValue,
              'MXN',
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <Target
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            Oportunidades
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {opportunities.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <TrendingUp
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            {messages.opportunities.highPriority}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {highPriorityCount}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <Sparkles
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            {messages.opportunities.averageScore}
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {averageScore}/100
          </p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 lg:flex-row">
            <label className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder={messages.opportunities.searchPlaceholder}
                className="w-full rounded-xl border border-white/10 bg-[#07111f] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#07111f] px-3">
              <Filter
                size={16}
                className="text-slate-500"
              />
              <select
                value={stage}
                onChange={(event) =>
                  setStage(
                    event.target.value as
                      | 'all'
                      | GrowthOpportunityStage,
                  )
                }
                className="bg-transparent py-2.5 text-sm text-slate-300 outline-none"
              >
                <option value="all">
                  {messages.opportunities.allStages}
                </option>
                <option value="discovered">
                  {messages.opportunities.discoveredPlural}
                </option>
                <option value="qualified">
                  {messages.opportunities.qualifiedPlural}
                </option>
                <option value="engaged">
                  {messages.opportunities.engagedPlural}
                </option>
                <option value="proposal">
                  {messages.opportunities.proposalPlural}
                </option>
                <option value="negotiation">
                  {messages.opportunities.negotiationPlural}
                </option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            {visibleOpportunities.map(
              (opportunity) => (
                <button
                  key={opportunity.id}
                  type="button"
                  onClick={() =>
                    setSelectedId(
                      opportunity.id,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-cyan-300/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2
                          size={17}
                          className="text-cyan-300"
                        />
                        <h2 className="font-semibold text-white">
                          {
                            opportunity
                              .prospect
                              .company
                          }
                        </h2>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {
                          opportunity
                            .prospect.name
                        }{' '}
                        ·{' '}
                        {
                          opportunity
                            .prospect.role
                        }
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {
                          stageLabels[
                            opportunity.stage
                          ]
                        }{' '}
                        · {messages.opportunities.source}:{' '}
                        {opportunity.source}
                      </p>
                    </div>

                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-slate-500">
                          Potencial
                        </p>
                        <p className="mt-1 font-semibold text-white">
                          {formatCurrency(
                            opportunity
                              .estimatedValue,
                            opportunity.currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          {messages.opportunities.auraScore}
                        </p>
                        <p className="mt-1 text-xl font-semibold text-cyan-200">
                          {
                            opportunity
                              .intelligence.score
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.045] p-6">
          <div className="flex items-center gap-2 text-cyan-200">
            <Sparkles size={18} />
            <span className="text-sm font-semibold">
              {messages.opportunities.auraRecommends}
            </span>
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            {selected.prospect.company}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {selected.prospect.name}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
              <p className="text-xs text-slate-500">
                {messages.opportunities.score}
              </p>
              <p className="mt-1 text-2xl font-semibold text-cyan-200">
                {selected.intelligence.score}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
              <p className="text-xs text-slate-500">
                {messages.opportunities.confidence}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {
                  selected
                    .intelligence
                    .confidence
                }%
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-300">
            {
              localizedRationale
            }
          </p>

          <div className="mt-5 space-y-2">
            {selected.intelligence.signals.map(
              (signal) => (
                <div
                  key={signal.id}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {localizedSignalLabel(signal.type)}
                    </span>
                    <span className="text-sm font-semibold text-cyan-200">
                      {signal.strength}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>

          {localizedNextBestAction && (
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-[#07111f] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">
                {messages.opportunities.nextBestAction}
              </p>

              <p className="mt-2 font-semibold text-white">
                {
                  localizedNextBestAction.title
                }
              </p>

              <p className="mt-2 text-sm leading-5 text-slate-400">
                {
                  localizedNextBestAction.description
                }
              </p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <UserRound size={14} />
            {messages.opportunities.owner}:{' '}
            {
              selected.ownerDisplayName ||
              messages.opportunities.unassigned
            }
          </div>
        </aside>
      </div>
    </section>
  );
}
