import React, {
  useEffect,
  useState,
} from 'react';

import {
  Building2,
  CheckCircle2,
  Database,
  Save,
  Sparkles,
} from 'lucide-react';

import type {
  AuraIntelligenceContext,
} from '../../../types/auraIntelligence';

import type {
  BrandBrain,
} from '../types/brandBrain';

import {
  growthBrandBrainPersistenceService,
  isPersistableGrowthCompanyId,
  type GrowthBrandBrainSettingsInput,
} from '../services/growthBrandBrainPersistenceService';

import GrowthSocialChannelsSettings from './GrowthSocialChannelsSettings';

interface GrowthSettingsWorkspaceProps {
  readonly context?: AuraIntelligenceContext;
  readonly companyName?: string;
}

interface SettingsForm {
  companyName: string;
  businessDescription: string;
  industry: string;
  products: string;
  valueProposition: string;
  targetAudience: string;
  brandTone: string;
  differentiators: string;
  communicationStyle: string;
  businessGoals: string;
}

const emptyForm = (
  companyName = '',
): SettingsForm => ({
  companyName,
  businessDescription: '',
  industry: '',
  products: '',
  valueProposition: '',
  targetAudience: '',
  brandTone: '',
  differentiators: '',
  communicationStyle: '',
  businessGoals: '',
});

const profileToForm = (
  profile: BrandBrain,
): SettingsForm => ({
  companyName:
    profile.companyProfile
      .companyName.value ||
    '',
  businessDescription:
    profile.companyProfile
      .businessDescription
      .value ||
    '',
  industry:
    profile.industry.value ||
    '',
  products:
    (
      profile.products.value ||
      []
    ).join(', '),
  valueProposition:
    profile.valueProposition
      .value ||
    '',
  targetAudience:
    profile.targetAudience
      .value ||
    '',
  brandTone:
    profile.brandTone.value ||
    '',
  differentiators:
    (
      profile.differentiators
        .value ||
      []
    ).join(', '),
  communicationStyle:
    profile.communicationStyle
      .value ||
    '',
  businessGoals:
    (
      profile.businessGoals
        .value ||
      []
    ).join(', '),
});

const splitList = (
  value: string,
): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const formToInput = (
  form: SettingsForm,
): GrowthBrandBrainSettingsInput => ({
  companyName:
    form.companyName,
  businessDescription:
    form.businessDescription,
  industry:
    form.industry,
  products:
    splitList(form.products),
  valueProposition:
    form.valueProposition,
  targetAudience:
    form.targetAudience,
  brandTone:
    form.brandTone,
  differentiators:
    splitList(
      form.differentiators,
    ),
  communicationStyle:
    form.communicationStyle,
  businessGoals:
    splitList(
      form.businessGoals,
    ),
});

const inputClassName =
  'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/35 focus:bg-black/30';

const labelClassName =
  'text-xs font-bold uppercase tracking-[0.16em] text-white/45';

const GrowthSettingsWorkspace:
  React.FC<
    GrowthSettingsWorkspaceProps
  > = ({
    context,
    companyName,
  }) => {
    const companyId =
      context?.companyId ||
      '';

    const [
      form,
      setForm,
    ] =
      useState<SettingsForm>(
        emptyForm(
          companyName ||
            '',
        ),
      );

    const [
      profile,
      setProfile,
    ] =
      useState<BrandBrain | null>(
        null,
      );

    const [
      loading,
      setLoading,
    ] =
      useState(true);

    const [
      saving,
      setSaving,
    ] =
      useState(false);

    const [
      error,
      setError,
    ] =
      useState<string | null>(
        null,
      );

    const [
      message,
      setMessage,
    ] =
      useState<string | null>(
        null,
      );

    const persistable =
      isPersistableGrowthCompanyId(
        companyId,
      );

    useEffect(() => {
      let active = true;

      const load =
        async () => {
          setLoading(true);
          setError(null);
          setMessage(null);

          if (!persistable) {
            if (active) {
              setForm(
                emptyForm(
                  companyName ||
                    '',
                ),
              );

              setProfile(null);

              setError(
                'Aura Growth todavía no pudo resolver una empresa real para esta sesión. La persistencia permanece bloqueada.',
              );

              setLoading(false);
            }

            return;
          }

          try {
            const loaded =
              await growthBrandBrainPersistenceService
                .getProfile(
                  companyId,
                );

            if (!active) {
              return;
            }

            setProfile(loaded);

            if (loaded) {
              setForm(
                profileToForm(
                  loaded,
                ),
              );

              setMessage(
                'Brand Brain cargado desde el contexto persistente de la empresa.',
              );
            } else {
              setForm(
                emptyForm(
                  companyName ||
                    '',
                ),
              );

              setMessage(
                'Aún no existe un Brand Brain persistente. Completa el contexto y guárdalo.',
              );
            }
          } catch (loadError) {
            if (!active) {
              return;
            }

            setError(
              loadError instanceof Error
                ? loadError.message
                : 'No fue posible cargar el Brand Brain.',
            );
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        };

      void load();

      return () => {
        active = false;
      };
    }, [
      companyId,
      companyName,
      persistable,
    ]);

    const updateField = (
      field: keyof SettingsForm,
      value: string,
    ) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

    const save =
      async () => {
        if (
          !persistable ||
          saving
        ) {
          return;
        }

        setSaving(true);
        setError(null);
        setMessage(null);

        try {
          const saved =
            await growthBrandBrainPersistenceService
              .saveProfile(
                companyId,
                formToInput(
                  form,
                ),
              );

          setProfile(saved);

          setForm(
            profileToForm(
              saved,
            ),
          );

          setMessage(
            'Empresa y Brand Brain guardados correctamente.',
          );
        } catch (saveError) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : 'No fue posible guardar el Brand Brain.',
          );
        } finally {
          setSaving(false);
        }
      };

    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] to-blue-500/[0.03] p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-200">
                <Building2 size={18} />

                <p className="text-xs font-black uppercase tracking-[0.24em]">
                  Contexto empresarial
                </p>
              </div>

              <h3 className="mt-3 text-2xl font-black text-white">
                Empresa y Brand Brain
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
                Esta información se reutiliza en Growth Advisor, campañas y contenido para evitar volver a preguntar datos que Aura ya conoce.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-bold text-white/55">
                <Database size={14} />
                Firestore
              </span>

              {profile && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[11px] font-bold text-emerald-200">
                  <CheckCircle2 size={14} />
                  Persistente
                </span>
              )}

              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[11px] font-bold text-cyan-200">
                <Sparkles size={14} />
                {profile?.confidenceScore ?? 0}% contexto
              </span>
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-white/45">
            Cargando contexto empresarial...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-sm text-emerald-100">
            {message}
          </div>
        )}

        <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 lg:grid-cols-2">
          <label>
            <span className={labelClassName}>
              Nombre de la empresa
            </span>

            <input
              value={form.companyName}
              onChange={(event) =>
                updateField(
                  'companyName',
                  event.target.value,
                )
              }
              placeholder="Aura Nexus"
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Industria
            </span>

            <input
              value={form.industry}
              onChange={(event) =>
                updateField(
                  'industry',
                  event.target.value,
                )
              }
              placeholder="Software empresarial / IA"
              className={inputClassName}
            />
          </label>

          <label className="lg:col-span-2">
            <span className={labelClassName}>
              Descripción del negocio
            </span>

            <textarea
              rows={3}
              value={form.businessDescription}
              onChange={(event) =>
                updateField(
                  'businessDescription',
                  event.target.value,
                )
              }
              placeholder="Qué hace la empresa, para quién y qué problema resuelve."
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Productos y servicios
            </span>

            <textarea
              rows={3}
              value={form.products}
              onChange={(event) =>
                updateField(
                  'products',
                  event.target.value,
                )
              }
              placeholder="Aura HCM, Aura Intelligence, Aura Maintenance..."
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Audiencia objetivo
            </span>

            <textarea
              rows={3}
              value={form.targetAudience}
              onChange={(event) =>
                updateField(
                  'targetAudience',
                  event.target.value,
                )
              }
              placeholder="Empresas, sectores, perfiles decisores..."
              className={inputClassName}
            />
          </label>

          <label className="lg:col-span-2">
            <span className={labelClassName}>
              Propuesta de valor
            </span>

            <textarea
              rows={3}
              value={form.valueProposition}
              onChange={(event) =>
                updateField(
                  'valueProposition',
                  event.target.value,
                )
              }
              placeholder="Por qué el mercado debería elegir a la empresa."
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Tono de marca
            </span>

            <input
              value={form.brandTone}
              onChange={(event) =>
                updateField(
                  'brandTone',
                  event.target.value,
                )
              }
              placeholder="Profesional, innovador, directo..."
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Estilo de comunicación
            </span>

            <input
              value={form.communicationStyle}
              onChange={(event) =>
                updateField(
                  'communicationStyle',
                  event.target.value,
                )
              }
              placeholder="Ejecutivo, claro, orientado a resultados..."
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Diferenciadores
            </span>

            <textarea
              rows={3}
              value={form.differentiators}
              onChange={(event) =>
                updateField(
                  'differentiators',
                  event.target.value,
                )
              }
              placeholder="Separados por coma o por línea."
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>
              Metas de negocio
            </span>

            <textarea
              rows={3}
              value={form.businessGoals}
              onChange={(event) =>
                updateField(
                  'businessGoals',
                  event.target.value,
                )
              }
              placeholder="Generar leads, aumentar ventas, posicionar marca..."
              className={inputClassName}
            />
          </label>
        </section>

        <GrowthSocialChannelsSettings />

        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-white/80">
              Contexto reutilizable
            </p>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Company ID: {persistable ? companyId : 'no resuelto'}
            </p>
          </div>

          <button
            type="button"
            disabled={
              !persistable ||
              loading ||
              saving
            }
            onClick={() =>
              void save()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={16} />

            {saving
              ? 'Guardando...'
              : 'Guardar Empresa y Brand Brain'}
          </button>
        </section>
      </div>
    );
  };

export default GrowthSettingsWorkspace;