import React from 'react';

import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Megaphone,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

export interface GrowthExecutiveOverviewProps {
  readonly onOpenAdvisor?: () => void;
  readonly onOpenOpportunities?: () => void;
  readonly onOpenCampaigns?: () => void;
  readonly onOpenIntelligence?: () => void;
}

interface OverviewMetric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}

const metrics: readonly OverviewMetric[] = [
  {
    label: 'Growth Score',
    value: 'Pending',
    detail: 'Disponible cuando exista evidencia suficiente',
    icon: TrendingUp,
  },
  {
    label: 'Priority Opportunities',
    value: '—',
    detail: 'Aura priorizará oportunidades verificadas',
    icon: Target,
  },
  {
    label: 'Active Campaigns',
    value: '—',
    detail: 'Sin campañas activas conectadas todavía',
    icon: Megaphone,
  },
  {
    label: 'Performance',
    value: '—',
    detail: 'Los KPIs aparecerán al conectar fuentes',
    icon: BarChart3,
  },
] as const;

const GrowthExecutiveOverview: React.FC<
  GrowthExecutiveOverviewProps
> = ({
  onOpenAdvisor,
  onOpenOpportunities,
  onOpenCampaigns,
  onOpenIntelligence,
}) => {
  return (
    <div
      id="growth-executive-overview"
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.08] via-white/[0.025] to-blue-600/[0.06] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/[0.06] blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5">
              <Sparkles
                size={14}
                className="text-cyan-200"
              />

              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/80">
                Executive Growth Intelligence
              </span>
            </div>

            <h3 className="mt-5 text-2xl font-black tracking-tight text-white md:text-3xl">
              Convierte señales de crecimiento en decisiones claras.
            </h3>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/45">
              Aura conecta objetivos, oportunidades, campañas,
              ejecución y resultados para recomendar la siguiente
              acción con evidencia y gobierno.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAdvisor}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Abrir Growth Advisor
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
                  <Icon size={18} />
                </div>

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
                  Governed
                </span>
              </div>

              <p className="mt-5 text-xs font-bold text-white/40">
                {metric.label}
              </p>

              <p className="mt-1 text-2xl font-black text-white">
                {metric.value}
              </p>

              <p className="mt-2 text-[11px] font-medium leading-relaxed text-white/30">
                {metric.detail}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <button
          type="button"
          onClick={onOpenOpportunities}
          className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"
        >
          <Target size={22} className="text-cyan-200" />

          <h4 className="mt-5 text-base font-black text-white">
            Opportunities
          </h4>

          <p className="mt-2 text-xs leading-6 text-white/35">
            Identifica y prioriza oportunidades según potencial,
            evidencia y recomendación de Aura.
          </p>

          <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-cyan-200">
            Explorar oportunidades
            <ArrowRight size={14} />
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenCampaigns}
          className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"
        >
          <Megaphone size={22} className="text-cyan-200" />

          <h4 className="mt-5 text-base font-black text-white">
            Campaigns
          </h4>

          <p className="mt-2 text-xs leading-6 text-white/35">
            Convierte estrategia en campañas gobernadas con
            audiencia, canales, mensajes y KPIs.
          </p>

          <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-cyan-200">
            Gestionar campañas
            <ArrowRight size={14} />
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenIntelligence}
          className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"
        >
          <BrainCircuit size={22} className="text-cyan-200" />

          <h4 className="mt-5 text-base font-black text-white">
            Intelligence
          </h4>

          <p className="mt-2 text-xs leading-6 text-white/35">
            Comprende recomendaciones, evidencia, confianza,
            riesgos y siguientes acciones.
          </p>

          <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-cyan-200">
            Abrir Intelligence
            <ArrowRight size={14} />
          </span>
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/10 p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">
              Next Best Action
            </p>

            <h4 className="mt-2 text-base font-black text-white">
              Completa tu contexto de crecimiento
            </h4>

            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/35">
              Growth Advisor puede ayudarte a definir objetivos,
              Brand Brain, estrategia y plan de ejecución antes de
              activar fuentes productivas.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAdvisor}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/70 transition hover:border-cyan-300/20 hover:text-cyan-200"
          >
            Continuar con Advisor
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default GrowthExecutiveOverview;
