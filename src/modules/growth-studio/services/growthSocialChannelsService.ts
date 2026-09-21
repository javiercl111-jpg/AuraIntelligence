import {
  auth,
} from '../../../firebase';

export type GrowthSocialProvider =
  | 'LINKEDIN'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'YOUTUBE';

export type GrowthSocialAccountType =
  | 'PROFILE'
  | 'ORGANIZATION'
  | 'PAGE'
  | 'CHANNEL';

export type GrowthSocialConnectionState =
  | 'PENDING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'REVOKED'
  | 'ERROR';

export interface GrowthSocialProfileBinding {
  readonly bindingId: string;
  readonly tenantId: string;
  readonly provider: GrowthSocialProvider;
  readonly accountType: GrowthSocialAccountType;
  readonly externalAccountId: string;
  readonly displayName: string;
  readonly handle?: string;
  readonly profileUrl?: string;
  readonly connectionState: GrowthSocialConnectionState;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly connectedAt?: string;
  readonly lastVerifiedAt?: string;
}

export type GrowthSocialProfileUpsertInput =
  Omit<
    GrowthSocialProfileBinding,
    'tenantId'
  >;

interface GrowthSocialProfileListResponse {
  readonly status: 'SUCCEEDED';
  readonly operation: 'LIST_BY_TENANT';
  readonly tenantId: string;
  readonly principalId: string;
  readonly role: string;
  readonly bindings:
    readonly GrowthSocialProfileBinding[];
}

interface GrowthSocialProfileUpsertResponse {
  readonly status: 'SUCCEEDED';
  readonly operation: 'UPSERT';
  readonly tenantId: string;
  readonly principalId: string;
  readonly role: string;
  readonly binding:
    GrowthSocialProfileBinding;
}

interface GrowthSocialBridgeSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

interface GrowthSocialBridgeFailure {
  readonly ok: false;
  readonly code?: string;
}

type GrowthSocialBridgeEnvelope<T> =
  | GrowthSocialBridgeSuccess<T>
  | GrowthSocialBridgeFailure;

export interface GrowthSocialChannelsService {
  readonly listProfiles: (
    options?: Readonly<{
      provider?: GrowthSocialProvider;
      activeOnly?: boolean;
    }>,
  ) => Promise<
    readonly GrowthSocialProfileBinding[]
  >;

  readonly upsertProfile: (
    binding: GrowthSocialProfileUpsertInput,
  ) => Promise<GrowthSocialProfileBinding>;
}

export interface GrowthSocialChannelsServiceDependencies {
  readonly getEndpoint: () => string;
  readonly getIdToken: () => Promise<string>;
  readonly fetcher: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
}

const configuredBridgeUrlV1 =
  (): string =>
    (
      (
        import.meta.env as unknown as
          Record<
            string,
            string | undefined
          >
      )
        .VITE_GROWTH_SOCIAL_BRIDGE_URL ||
      ''
    ).trim();

export const isGrowthSocialBridgeConfigured =
  (): boolean =>
    Boolean(
      configuredBridgeUrlV1(),
    );

const currentFirebaseIdTokenV1 =
  async (): Promise<string> => {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        'GROWTH_SOCIAL_AUTH_REQUIRED',
      );
    }

    const token =
      await user.getIdToken();

    if (!token.trim()) {
      throw new Error(
        'GROWTH_SOCIAL_ID_TOKEN_EMPTY',
      );
    }

    return token;
  };

const bridgeFailureCodeV1 =
  (
    envelope:
      GrowthSocialBridgeEnvelope<unknown>,
    status:
      number,
  ): string => {
    if (
      envelope.ok === false &&
      envelope.code
    ) {
      return envelope.code;
    }

    return `GROWTH_SOCIAL_BRIDGE_HTTP_${status}`;
  };

export const createGrowthSocialChannelsService =
  (
    dependencies:
      GrowthSocialChannelsServiceDependencies,
  ): GrowthSocialChannelsService => {
    const invoke =
      async <T>(
        data: unknown,
      ): Promise<T> => {
        const endpoint =
          dependencies
            .getEndpoint()
            .trim();

        if (!endpoint) {
          throw new Error(
            'GROWTH_SOCIAL_BRIDGE_NOT_CONFIGURED',
          );
        }

        const token =
          await dependencies
            .getIdToken();

        const response =
          await dependencies.fetcher(
            endpoint,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify(data),
            },
          );

        let envelope:
          GrowthSocialBridgeEnvelope<T>;

        try {
          envelope =
            await response.json() as
              GrowthSocialBridgeEnvelope<T>;
        } catch {
          throw new Error(
            'GROWTH_SOCIAL_BRIDGE_RESPONSE_INVALID',
          );
        }

        if (
          !response.ok ||
          envelope.ok !== true
        ) {
          throw new Error(
            bridgeFailureCodeV1(
              envelope as
                GrowthSocialBridgeEnvelope<unknown>,
              response.status,
            ),
          );
        }

        return envelope.data;
      };

    return Object.freeze({
      listProfiles:
        async (
          options:
            Readonly<{
              provider?: GrowthSocialProvider;
              activeOnly?: boolean;
            }> = {},
        ) => {
          const response =
            await invoke<
              GrowthSocialProfileListResponse
            >({
              operation:
                'LIST_BY_TENANT',
              ...(options.provider
                ? {
                    provider:
                      options.provider,
                  }
                : {}),
              ...(typeof options.activeOnly ===
              'boolean'
                ? {
                    activeOnly:
                      options.activeOnly,
                  }
                : {}),
            });

          if (
            response.operation !==
            'LIST_BY_TENANT'
          ) {
            throw new Error(
              'GROWTH_SOCIAL_LIST_RESPONSE_INVALID',
            );
          }

          return response.bindings;
        },

      upsertProfile:
        async (
          binding:
            GrowthSocialProfileUpsertInput,
        ) => {
          const response =
            await invoke<
              GrowthSocialProfileUpsertResponse
            >({
              operation:
                'UPSERT',
              binding,
            });

          if (
            response.operation !==
            'UPSERT'
          ) {
            throw new Error(
              'GROWTH_SOCIAL_UPSERT_RESPONSE_INVALID',
            );
          }

          return response.binding;
        },
    });
  };

export const growthSocialChannelsService =
  createGrowthSocialChannelsService({
    getEndpoint:
      configuredBridgeUrlV1,

    getIdToken:
      currentFirebaseIdTokenV1,

    fetcher:
      (
        input,
        init,
      ) =>
        fetch(
          input,
          init,
        ),
  });