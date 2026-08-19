import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Megaphone,
  Target,
  Users,
} from 'lucide-react';

import {
  useGrowthI18n,
} from '../i18n/GrowthI18nProvider';

import { useGrowthRuntime } from '../runtime/GrowthRuntimeProvider';

type CampaignFieldStatus =
  | 'confirmed'
  | 'inferred'
  | 'missing';

interface CampaignField {
  labelEs: string;
  labelEn: string;
  value: string;
  status: CampaignFieldStatus;
}

interface GrowthCampaignsWorkspaceProps {
  readonly onOpenAdvisor?: () => void;
}

export default function GrowthCampaignsWorkspace({
  onOpenAdvisor,
}: GrowthCampaignsWorkspaceProps) {
  const {
    campaignStrategy,
  } = useGrowthRuntime();
  const {
    locale,
  } = useGrowthI18n();

  const isSpanish =
    locale === 'es';

  const copy = isSpanish
    ? {
        eyebrow: 'Inteligencia de Campañas',
        title: 'Portafolio de campañas',
        description:
          'Convierte estrategia en campañas gobernadas con evidencia, audiencia, canales, mensajes y KPIs.',
        readiness: 'Preparación',
        evidence: 'Evidencia',
        active: 'Campañas activas',
        strategy: 'Estrategia de campaña',
        risks: 'Riesgos y brechas',
        riskDetail:
          'Falta confirmar el llamado a la acción antes de considerar la campaña lista para ejecución.',
        confirmed: 'Confirmado',
        inferred: 'Inferido',
        missing: 'Pendiente',
        nextAction: 'Siguiente mejor acción',
        recommendation:
          'Confirma los elementos pendientes antes de activar ejecución.',
        emptyTitle:
          'Aún no existe una estrategia de campaña',
        emptyDescription:
          'Completa el contexto estratégico en Growth Advisor para que Aura construya una estrategia basada en evidencia.',
        emptyAction:
          'Abrir Growth Advisor',
        noValue:
          'Sin evidencia disponible',
      }
    : {
        eyebrow: 'Campaign Intelligence',
        title: 'Campaign portfolio',
        description:
          'Turn strategy into governed campaigns with evidence, audiences, channels, messages and KPIs.',
        readiness: 'Readiness',
        evidence: 'Evidence',
        active: 'Active campaigns',
        strategy: 'Campaign strategy',
        risks: 'Risks and gaps',
        riskDetail:
          'Confirm the call to action before considering the campaign ready for execution.',
        confirmed: 'Confirmed',
        inferred: 'Inferred',
        missing: 'Pending',
        nextAction: 'Next Best Action',
        recommendation:
          'Confirm pending elements before activating execution.',
        emptyTitle:
          'No campaign strategy yet',
        emptyDescription:
          'Complete the strategic context in Growth Advisor so Aura can build an evidence-based campaign strategy.',
        emptyAction:
          'Open Growth Advisor',
        noValue:
          'No evidence available',
      };

  const campaignFields: readonly CampaignField[] =
    campaignStrategy
      ? [
          {
            labelEs: 'Objetivo',
            labelEn: 'Objective',
            value:
              campaignStrategy
                .campaignObjective
                .value ||
              copy.noValue,
            status:
              campaignStrategy
                .campaignObjective
                .status,
          },
          {
            labelEs: 'Audiencia principal',
            labelEn: 'Primary audience',
            value:
              campaignStrategy
                .primaryAudience
                .value ||
              copy.noValue,
            status:
              campaignStrategy
                .primaryAudience
                .status,
          },
          {
            labelEs: 'Mensaje central',
            labelEn: 'Core message',
            value:
              campaignStrategy
                .coreMessage
                .value ||
              copy.noValue,
            status:
              campaignStrategy
                .coreMessage
                .status,
          },
          {
            labelEs: 'Canales',
            labelEn: 'Channels',
            value:
              campaignStrategy
                .recommendedChannels
                .value
                ?.join(' · ') ||
              copy.noValue,
            status:
              campaignStrategy
                .recommendedChannels
                .status,
          },
          {
            labelEs: 'Contenido',
            labelEn: 'Content',
            value:
              campaignStrategy
                .recommendedContentTypes
                .value
                ?.join(' · ') ||
              copy.noValue,
            status:
              campaignStrategy
                .recommendedContentTypes
                .status,
          },
          {
            labelEs: 'CTA',
            labelEn: 'CTA',
            value:
              campaignStrategy
                .callsToAction
                .value
                ?.join(' · ') ||
              copy.noValue,
            status:
              campaignStrategy
                .callsToAction
                .status,
          },
        ]
      : [];
  const statusLabel = (
    status: CampaignFieldStatus,
  ) => {
    switch (status) {
      case 'confirmed':
        return copy.confirmed;
      case 'inferred':
        return copy.inferred;
      case 'missing':
      default:
        return copy.missing;
    }
  };

  if (!campaignStrategy) {
    return (
      <section
        aria-label={copy.title}
        className="space-y-5"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            {copy.eyebrow}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {copy.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {copy.description}
          </p>
        </div>

        <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-8">
          <Megaphone
            size={24}
            className="text-cyan-300"
          />

          <h3 className="mt-5 text-xl font-semibold text-white">
            {copy.emptyTitle}
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {copy.emptyDescription}
          </p>

          <button
            type="button"
            onClick={onOpenAdvisor}
            className="mt-5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {copy.emptyAction}
          </button>
        </article>
      </section>
    );
  }

  return (
    <section
      aria-label={copy.title}
      className="space-y-5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
          {copy.eyebrow}
        </p>

        <h2 className="mt-2 text-3xl font-bold text-white">
          {copy.title}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <BarChart3
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-500">
            {copy.readiness}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {campaignStrategy.readinessScore}/100
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <CheckCircle2
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-500">
            {copy.evidence}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {campaignStrategy.strategyEvidenceScore}/100
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <Megaphone
            size={20}
            className="text-cyan-300"
          />
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-500">
            {copy.active}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {campaignStrategy ? 1 : 0}
          </p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <Target
              size={18}
              className="text-cyan-300"
            />
            <h3 className="font-semibold text-white">
              {copy.strategy}
            </h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {campaignFields.map(
              (field) => (
                <div
                  key={field.labelEn}
                  className="rounded-xl border border-white/10 bg-[#07111f] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                      {
                        isSpanish
                          ? field.labelEs
                          : field.labelEn
                      }
                    </p>

                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                      {
                        statusLabel(
                          field.status,
                        )
                      }
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-5 text-slate-200">
                    {field.value}
                  </p>
                </div>
              ),
            )}
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-amber-300/15 bg-white/[0.025] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={18}
                className="text-amber-300"
              />
              <h3 className="font-semibold text-white">
                {copy.risks}
              </h3>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              {
                campaignStrategy
                  .strategyRisks[0]
                  ?.description ||
                campaignStrategy
                  .knowledgeGaps[0]
                  ?.label ||
                copy.recommendation
              }
            </p>
          </article>

          <article className="rounded-2xl border border-cyan-300/20 bg-[#07111f] p-5">
            <div className="flex items-center gap-2">
              <Users
                size={18}
                className="text-cyan-300"
              />
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                {copy.nextAction}
              </p>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-white">
              {copy.recommendation}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
