import React, {
  useEffect,
  useState,
} from 'react';

import {
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';

import {
  growthSocialChannelsService,
  isGrowthSocialBridgeConfigured,
  type GrowthSocialAccountType,
  type GrowthSocialChannelsService,
  type GrowthSocialProfileBinding,
  type GrowthSocialProvider,
} from '../services/growthSocialChannelsService';

type TargetGrowthSocialProvider =
  | 'LINKEDIN'
  | 'FACEBOOK'
  | 'INSTAGRAM';

interface GrowthSocialChannelDefinition {
  readonly provider:
    TargetGrowthSocialProvider;
  readonly title: string;
  readonly accountType:
    GrowthSocialAccountType;
  readonly description: string;
}

interface GrowthSocialChannelDraft {
  externalAccountId: string;
  displayName: string;
  handle: string;
  profileUrl: string;
}

interface GrowthSocialChannelsSettingsProps {
  readonly service?:
    GrowthSocialChannelsService;
  readonly bridgeConfigured?:
    boolean;
  readonly now?:
    () => string;
}

const CHANNELS:
  readonly GrowthSocialChannelDefinition[] =
  Object.freeze([
    {
      provider:
        'LINKEDIN',
      title:
        'LinkedIn',
      accountType:
        'ORGANIZATION',
      description:
        'Organización administrada mediante el plano de control de Aura.',
    },
    {
      provider:
        'FACEBOOK',
      title:
        'Facebook',
      accountType:
        'PAGE',
      description:
        'Página empresarial registrada como perfil gobernado.',
    },
    {
      provider:
        'INSTAGRAM',
      title:
        'Instagram',
      accountType:
        'PROFILE',
      description:
        'Perfil empresarial o profesional registrado para Growth.',
    },
  ]);

const emptyDrafts =
  (): Record<
    TargetGrowthSocialProvider,
    GrowthSocialChannelDraft
  > => ({
    LINKEDIN: {
      externalAccountId: '',
      displayName: '',
      handle: '',
      profileUrl: '',
    },
    FACEBOOK: {
      externalAccountId: '',
      displayName: '',
      handle: '',
      profileUrl: '',
    },
    INSTAGRAM: {
      externalAccountId: '',
      displayName: '',
      handle: '',
      profileUrl: '',
    },
  });

const bindingForProvider =
  (
    bindings:
      readonly GrowthSocialProfileBinding[],
    provider:
      TargetGrowthSocialProvider,
  ):
    GrowthSocialProfileBinding |
    undefined =>
    bindings.find(
      (binding) =>
        binding.provider === provider &&
        binding.isActive,
    ) ||
    bindings.find(
      (binding) =>
        binding.provider === provider,
    );

const draftFromBinding =
  (
    binding?:
      GrowthSocialProfileBinding,
  ): GrowthSocialChannelDraft => ({
    externalAccountId:
      binding?.externalAccountId ||
      '',
    displayName:
      binding?.displayName ||
      '',
    handle:
      binding?.handle ||
      '',
    profileUrl:
      binding?.profileUrl ||
      '',
  });

const stableBindingId =
  (
    provider:
      TargetGrowthSocialProvider,
    externalAccountId:
      string,
  ): string => {
    const segment =
      externalAccountId
        .trim()
        .replace(
          /[^a-zA-Z0-9._-]/g,
          '-',
        )
        .replace(
          /-+/g,
          '-',
        )
        .replace(
          /^-|-$/g,
          '',
        )
        .slice(
          0,
          80,
        );

    return [
      'growth',
      provider.toLowerCase(),
      segment ||
        'account',
    ].join('-');
  };

const safeMessage =
  (
    error:
      unknown,
    fallback:
      string,
  ): string =>
    error instanceof Error &&
    error.message
      ? error.message
      : fallback;

const inputClassName =
  'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/35 focus:bg-black/30';

const labelClassName =
  'text-xs font-bold uppercase tracking-[0.16em] text-white/45';

const GrowthSocialChannelsSettings:
  React.FC<
    GrowthSocialChannelsSettingsProps
  > = ({
    service =
      growthSocialChannelsService,
    bridgeConfigured =
      isGrowthSocialBridgeConfigured(),
    now =
      () =>
        new Date()
          .toISOString(),
  }) => {
    const [
      drafts,
      setDrafts,
    ] =
      useState(
        emptyDrafts,
      );

    const [
      bindings,
      setBindings,
    ] =
      useState<
        Partial<
          Record<
            TargetGrowthSocialProvider,
            GrowthSocialProfileBinding
          >
        >
      >({});

    const [
      loading,
      setLoading,
    ] =
      useState(false);

    const [
      savingProvider,
      setSavingProvider,
    ] =
      useState<
        TargetGrowthSocialProvider |
        null
      >(null);

    const [
      notice,
      setNotice,
    ] =
      useState(
        bridgeConfigured
          ? 'Listo para consultar perfiles gobernados.'
          : 'El bridge social aún no está configurado en este entorno.',
      );

    const loadChannels =
      async (): Promise<void> => {
        if (
          !bridgeConfigured
        ) {
          setNotice(
            'El bridge social aún no está configurado en este entorno.',
          );

          return;
        }

        setLoading(true);

        try {
          const loaded =
            await service
              .listProfiles({
                activeOnly:
                  false,
              });

          const nextBindings:
            Partial<
              Record<
                TargetGrowthSocialProvider,
                GrowthSocialProfileBinding
              >
            > =
            {};

          const nextDrafts =
            emptyDrafts();

          for (
            const channel
            of CHANNELS
          ) {
            const binding =
              bindingForProvider(
                loaded,
                channel.provider,
              );

            if (binding) {
              nextBindings[
                channel.provider
              ] =
                binding;

              nextDrafts[
                channel.provider
              ] =
                draftFromBinding(
                  binding,
                );
            }
          }

          setBindings(
            nextBindings,
          );

          setDrafts(
            nextDrafts,
          );

          setNotice(
            'Perfiles gobernados actualizados.',
          );
        } catch (
          loadError
        ) {
          setNotice(
            safeMessage(
              loadError,
              'No fue posible consultar los perfiles sociales gobernados.',
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    useEffect(
      () => {
        void loadChannels();
      },
      [
        bridgeConfigured,
        service,
      ],
    );

    const updateDraft =
      (
        provider:
          TargetGrowthSocialProvider,
        field:
          keyof GrowthSocialChannelDraft,
        value:
          string,
      ): void => {
        setDrafts(
          (current) => ({
            ...current,
            [provider]: {
              ...current[
                provider
              ],
              [field]:
                value,
            },
          }),
        );
      };

    const saveChannel =
      async (
        channel:
          GrowthSocialChannelDefinition,
      ): Promise<void> => {
        if (
          !bridgeConfigured
        ) {
          setNotice(
            'Configura primero el endpoint gobernado del bridge social.',
          );

          return;
        }

        const draft =
          drafts[
            channel.provider
          ];

        const externalAccountId =
          draft.externalAccountId
            .trim();

        const displayName =
          draft.displayName
            .trim();

        if (
          !externalAccountId ||
          !displayName
        ) {
          setNotice(
            'Completa External Account ID y nombre visible antes de guardar.',
          );

          return;
        }

        const existing =
          bindings[
            channel.provider
          ];

        const timestamp =
          now();

        setSavingProvider(
          channel.provider,
        );

        try {
          const saved =
            await service
              .upsertProfile({
                bindingId:
                  existing?.bindingId ||
                  stableBindingId(
                    channel.provider,
                    externalAccountId,
                  ),
                provider:
                  channel.provider as
                    GrowthSocialProvider,
                accountType:
                  existing?.accountType ||
                  channel.accountType,
                externalAccountId,
                displayName,
                ...(draft.handle.trim()
                  ? {
                      handle:
                        draft.handle.trim(),
                    }
                  : {}),
                ...(draft.profileUrl.trim()
                  ? {
                      profileUrl:
                        draft.profileUrl.trim(),
                    }
                  : {}),
                connectionState:
                  existing
                    ?.connectionState ||
                  'DISCONNECTED',
                isActive:
                  true,
                createdAt:
                  existing
                    ?.createdAt ||
                  timestamp,
                updatedAt:
                  timestamp,
                ...(existing
                  ?.connectedAt
                  ? {
                      connectedAt:
                        existing.connectedAt,
                    }
                  : {}),
                ...(existing
                  ?.lastVerifiedAt
                  ? {
                      lastVerifiedAt:
                        existing.lastVerifiedAt,
                    }
                  : {}),
              });

          setBindings(
            (current) => ({
              ...current,
              [channel.provider]:
                saved,
            }),
          );

          setDrafts(
            (current) => ({
              ...current,
              [channel.provider]:
                draftFromBinding(
                  saved,
                ),
            }),
          );

          setNotice(
            `${channel.title}: perfil gobernado guardado.`,
          );
        } catch (
          saveError
        ) {
          setNotice(
            safeMessage(
              saveError,
              `No fue posible guardar ${channel.title}.`,
            ),
          );
        } finally {
          setSavingProvider(
            null,
          );
        }
      };

    return (
      <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-200">
              <ShieldCheck
                size={18}
              />

              <p className="text-xs font-black uppercase tracking-[0.18em]">
                Canales sociales gobernados
              </p>
            </div>

            <h3 className="mt-2 text-xl font-black text-white">
              LinkedIn, Facebook e Instagram
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Registra los metadatos de tus perfiles sociales. OAuth, tokens y publicación permanecen fuera del navegador y bajo Control Center.
            </p>
          </div>

          <button
            type="button"
            disabled={
              !bridgeConfigured ||
              loading
            }
            onClick={() =>
              void loadChannels()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Actualizar
          </button>
        </div>

        <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] px-4 py-3 text-xs leading-5 text-cyan-100/70">
          {notice}
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {CHANNELS.map(
            (channel) => {
              const draft =
                drafts[
                  channel.provider
                ];

              const binding =
                bindings[
                  channel.provider
                ];

              const saving =
                savingProvider ===
                channel.provider;

              return (
                <article
                  key={
                    channel.provider
                  }
                  className="rounded-2xl border border-white/10 bg-black/15 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-white">
                        {channel.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/40">
                        {channel.description}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                      {channel.accountType}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
                    <p className="text-[11px] font-bold text-white/55">
                      {binding
                        ? `Estado de metadatos: ${binding.connectionState}`
                        : 'Sin perfil gobernado'}
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-white/30">
                      CONNECTED no equivale a autorización OAuth ni habilita publicación.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className={labelClassName}>
                        External Account ID
                      </span>

                      <input
                        value={
                          draft.externalAccountId
                        }
                        onChange={
                          (event) =>
                            updateDraft(
                              channel.provider,
                              'externalAccountId',
                              event.target.value,
                            )
                        }
                        placeholder="ID de la organización, página o perfil"
                        className={inputClassName}
                      />
                    </label>

                    <label className="block">
                      <span className={labelClassName}>
                        Nombre visible
                      </span>

                      <input
                        value={
                          draft.displayName
                        }
                        onChange={
                          (event) =>
                            updateDraft(
                              channel.provider,
                              'displayName',
                              event.target.value,
                            )
                        }
                        placeholder="Aura Nexus"
                        className={inputClassName}
                      />
                    </label>

                    <label className="block">
                      <span className={labelClassName}>
                        Handle
                      </span>

                      <input
                        value={
                          draft.handle
                        }
                        onChange={
                          (event) =>
                            updateDraft(
                              channel.provider,
                              'handle',
                              event.target.value,
                            )
                        }
                        placeholder="@auranexus"
                        className={inputClassName}
                      />
                    </label>

                    <label className="block">
                      <span className={labelClassName}>
                        URL del perfil
                      </span>

                      <input
                        value={
                          draft.profileUrl
                        }
                        onChange={
                          (event) =>
                            updateDraft(
                              channel.provider,
                              'profileUrl',
                              event.target.value,
                            )
                        }
                        placeholder="https://..."
                        className={inputClassName}
                      />
                    </label>
                  </div>

                  <div className="mt-5 space-y-2">
                    <button
                      type="button"
                      disabled={
                        !bridgeConfigured ||
                        loading ||
                        saving
                      }
                      onClick={() =>
                        void saveChannel(
                          channel,
                        )
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save
                        size={15}
                      />

                      {saving
                        ? 'Guardando...'
                        : 'Guardar perfil gobernado'}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/30"
                      >
                        OAuth no habilitado
                      </button>

                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/30"
                      >
                        Publicación no habilitada
                      </button>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>

        <p className="text-[11px] leading-5 text-white/30">
          Endpoint esperado: VITE_GROWTH_SOCIAL_BRIDGE_URL. Mientras no exista en el entorno, esta sección permanece visible pero fail-closed.
        </p>
      </section>
    );
  };

export default GrowthSocialChannelsSettings;