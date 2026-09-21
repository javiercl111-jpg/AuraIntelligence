import {
  FileStack,
  Lock,
  Megaphone,
  Sparkles,
  Target,
} from 'lucide-react';

import {
  ContentPlanSummary,
} from '../components/ContentPlanSummary';

import {
  ExecutiveContentBriefSummary,
} from '../components/ExecutiveContentBriefSummary';

import {
  ExecutiveExecutionPlanSummary,
} from '../components/ExecutiveExecutionPlanSummary';

import {
  useGrowthI18n,
} from '../i18n/GrowthI18nProvider';

import {
  useGrowthRuntime,
} from '../runtime/GrowthRuntimeProvider';

interface GrowthContentExecutionWorkspaceProps {
  readonly onOpenAdvisor?: () => void;
  readonly onOpenCampaigns?: () => void;
}

const displayStatus = (
  value:
    unknown,
): string => {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return 'Pendiente';
  }

  return value
    .trim()
    .replace(
      /_/g,
      ' ',
    );
};

export default function GrowthContentExecutionWorkspace({
  onOpenAdvisor,
  onOpenCampaigns,
}: GrowthContentExecutionWorkspaceProps) {
  const {
    campaignStrategy,
    execution,
    contentPlan,
    contentBrief,
  } =
    useGrowthRuntime();

  const {
    messages,
  } =
    useGrowthI18n();

  const advisor =
    messages.advisorPresentation;

  const hasExecutionArtifacts =
    Boolean(
      execution ||
      contentPlan ||
      contentBrief,
    );

  const assetCount =
    contentPlan
      ?.contentAssets
      .length ||
    0;

  return (
    <div
      id="growth-content-execution-workspace"
      className="space-y-6"
    >
      <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] via-blue-500/[0.035] to-transparent p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-cyan-200">
              <FileStack
                size={18}
              />

              <span className="text-xs font-black uppercase tracking-[0.18em]">
                Workspace operativo
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
              {messages.nav.contentExecution}
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              {messages.nav.contentExecutionDescription}
            </p>

            <p className="mt-3 text-sm leading-6 text-white/40">
              Reutiliza el plan de ejecución, el plan de contenido y el brief generados por Growth Advisor. Esta superficie no crea un segundo modelo de campaña.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-200">
              <Lock
                size={15}
              />

              <span className="text-xs font-black uppercase tracking-[0.14em]">
                Ejecución gobernada
              </span>
            </div>

            <p className="mt-1 max-w-xs text-xs leading-5 text-white/35">
              Preparación y revisión solamente. Ninguna publicación externa se ejecuta desde esta pantalla.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-white/45">
            <Target
              size={15}
            />

            <span className="text-[10px] font-black uppercase tracking-[0.14em]">
              Estrategia
            </span>
          </div>

          <p className="mt-3 text-xl font-black text-white">
            {campaignStrategy
              ? `${campaignStrategy.readinessScore}/100`
              : 'Pendiente'}
          </p>

          <p className="mt-1 text-xs text-white/30">
            Readiness de campaña
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-white/45">
            <Sparkles
              size={15}
            />

            <span className="text-[10px] font-black uppercase tracking-[0.14em]">
              {advisor.executiveExecutionPlan}
            </span>
          </div>

          <p className="mt-3 text-sm font-black uppercase text-white">
            {displayStatus(
              execution?.status,
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-white/45">
            <FileStack
              size={15}
            />

            <span className="text-[10px] font-black uppercase tracking-[0.14em]">
              {advisor.contentPlanning}
            </span>
          </div>

          <p className="mt-3 text-xl font-black text-white">
            {assetCount}
          </p>

          <p className="mt-1 text-xs text-white/30">
            Activos planificados
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-white/45">
            <Megaphone
              size={15}
            />

            <span className="text-[10px] font-black uppercase tracking-[0.14em]">
              {advisor.executiveContentBrief}
            </span>
          </div>

          <p className="mt-3 text-sm font-black uppercase text-white">
            {displayStatus(
              contentBrief?.status,
            )}
          </p>
        </article>
      </section>

      {!hasExecutionArtifacts && (
        <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.018] p-8 text-center">
          <FileStack
            size={32}
            className="mx-auto text-white/20"
          />

          <h3 className="mt-4 text-lg font-black text-white">
            Aún no hay artefactos de ejecución preparados
          </h3>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Define y confirma el contexto estratégico en Growth Advisor. Cuando el flujo tenga suficiente evidencia, aquí aparecerán el plan de ejecución, los activos de contenido y el brief.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              disabled={!onOpenAdvisor}
              onClick={onOpenAdvisor}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Abrir Growth Advisor
            </button>

            <button
              type="button"
              disabled={!onOpenCampaigns}
              onClick={onOpenCampaigns}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/65 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revisar campañas
            </button>
          </div>
        </section>
      )}

      {execution && (
        <section
          data-growth-artifact="execution"
          className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-1"
        >
          <ExecutiveExecutionPlanSummary
            plan={execution}
          />
        </section>
      )}

      {contentPlan && (
        <section
          data-growth-artifact="content-plan"
          className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-1"
        >
          <ContentPlanSummary
            plan={contentPlan}
          />
        </section>
      )}

      {contentBrief && (
        <section
          data-growth-artifact="content-brief"
          className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-1"
        >
          <ExecutiveContentBriefSummary
            brief={contentBrief}
          />
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-amber-300/15 bg-amber-300/[0.045] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-100">
            <Lock
              size={15}
            />

            <p className="text-sm font-black">
              Publicación externa bloqueada
            </p>
          </div>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-white/35">
            Los contratos de publicación requieren aprobación válida y canal autorizado. 01C sólo prepara y revisa los artefactos existentes.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-white/30"
        >
          Publicación no habilitada
        </button>
      </section>
    </div>
  );
}