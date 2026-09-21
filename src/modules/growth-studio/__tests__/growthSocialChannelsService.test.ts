import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock(
  '../../../firebase',
  () => ({
    auth: {
      currentUser: null,
    },
  }),
);

import {
  createGrowthSocialChannelsService,
  type GrowthSocialProfileUpsertInput,
} from '../services/growthSocialChannelsService';

const jsonResponse =
  (
    body:
      unknown,
    status =
      200,
  ): Response =>
    ({
      ok:
        status >= 200 &&
        status < 300,
      status,
      json:
        vi.fn(
          async () =>
            body,
        ),
    }) as unknown as
      Response;

describe(
  'AGFC01 | growthSocialChannelsService',
  () => {
    it(
      'lists profiles through the bridge without browser tenant authority',
      async () => {
        const fetcher =
          vi.fn(
            async (
              _input:
                RequestInfo | URL,
              _init?:
                RequestInit,
            ) =>
              jsonResponse({
                ok: true,
                data: {
                  status:
                    'SUCCEEDED',
                  operation:
                    'LIST_BY_TENANT',
                  tenantId:
                    'server-tenant',
                  principalId:
                    'server-principal',
                  role:
                    'SUPER_ADMIN',
                  bindings:
                    [],
                },
              }),
          );

        const service =
          createGrowthSocialChannelsService({
            getEndpoint:
              () =>
                'https://bridge.example.test',
            getIdToken:
              async () =>
                'opaque-id-token',
            fetcher,
          });

        const result =
          await service
            .listProfiles({
              provider:
                'LINKEDIN',
              activeOnly:
                false,
            });

        expect(
          result,
        ).toEqual([]);

        expect(
          fetcher,
        ).toHaveBeenCalledTimes(1);

        const [
          endpoint,
          init,
        ] =
          fetcher.mock.calls[0];

        expect(
          endpoint,
        ).toBe(
          'https://bridge.example.test',
        );

        const headers =
          init?.headers as
            Record<
              string,
              string
            >;

        expect(
          headers.Authorization,
        ).toBe(
          'Bearer opaque-id-token',
        );

        const body =
          JSON.parse(
            String(
              init?.body,
            ),
          );

        expect(
          body,
        ).toEqual({
          operation:
            'LIST_BY_TENANT',
          provider:
            'LINKEDIN',
          activeOnly:
            false,
        });

        const serialized =
          JSON.stringify(
            body,
          );

        expect(
          serialized,
        ).not.toContain(
          'tenantId',
        );

        expect(
          serialized,
        ).not.toContain(
          'principalId',
        );

        expect(
          serialized,
        ).not.toContain(
          'opaque-id-token',
        );
      },
    );

    it(
      'upserts only governed profile metadata and never credentials',
      async () => {
        const fetcher =
          vi.fn(
            async () =>
              jsonResponse({
                ok: true,
                data: {
                  status:
                    'SUCCEEDED',
                  operation:
                    'UPSERT',
                  tenantId:
                    'server-tenant',
                  principalId:
                    'server-principal',
                  role:
                    'SUPER_ADMIN',
                  binding: {
                    bindingId:
                      'growth-linkedin-123',
                    tenantId:
                      'server-tenant',
                    provider:
                      'LINKEDIN',
                    accountType:
                      'ORGANIZATION',
                    externalAccountId:
                      '123',
                    displayName:
                      'Aura Nexus',
                    connectionState:
                      'DISCONNECTED',
                    isActive:
                      true,
                    createdAt:
                      '2026-09-17T10:00:00.000Z',
                    updatedAt:
                      '2026-09-17T10:00:00.000Z',
                  },
                },
              }),
          );

        const service =
          createGrowthSocialChannelsService({
            getEndpoint:
              () =>
                'https://bridge.example.test',
            getIdToken:
              async () =>
                'opaque-id-token',
            fetcher,
          });

        const binding:
          GrowthSocialProfileUpsertInput =
          {
            bindingId:
              'growth-linkedin-123',
            provider:
              'LINKEDIN',
            accountType:
              'ORGANIZATION',
            externalAccountId:
              '123',
            displayName:
              'Aura Nexus',
            connectionState:
              'DISCONNECTED',
            isActive:
              true,
            createdAt:
              '2026-09-17T10:00:00.000Z',
            updatedAt:
              '2026-09-17T10:00:00.000Z',
          };

        const saved =
          await service
            .upsertProfile(
              binding,
            );

        expect(
          saved.provider,
        ).toBe(
          'LINKEDIN',
        );

        const [
          ,
          init,
        ] =
          fetcher.mock.calls[0] as unknown as [
            RequestInfo | URL,
            RequestInit?,
          ];

        const body =
          JSON.parse(
            String(
              init?.body,
            ),
          );

        expect(
          body.operation,
        ).toBe(
          'UPSERT',
        );

        expect(
          body.binding,
        ).toEqual(
          binding,
        );

        const serialized =
          JSON.stringify(
            body,
          );

        expect(
          serialized,
        ).not.toContain(
          'tenantId',
        );

        expect(
          serialized.toLowerCase(),
        ).not.toContain(
          'credential',
        );

        expect(
          serialized.toLowerCase(),
        ).not.toContain(
          'accesstoken',
        );
      },
    );

    it(
      'fails closed before authentication when the bridge endpoint is absent',
      async () => {
        const getIdToken =
          vi.fn(
            async () =>
              'should-not-run',
          );

        const fetcher =
          vi.fn();

        const service =
          createGrowthSocialChannelsService({
            getEndpoint:
              () =>
                '',
            getIdToken,
            fetcher,
          });

        await expect(
          service.listProfiles(),
        ).rejects.toThrow(
          'GROWTH_SOCIAL_BRIDGE_NOT_CONFIGURED',
        );

        expect(
          getIdToken,
        ).not.toHaveBeenCalled();

        expect(
          fetcher,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'surfaces only the safe bridge error code',
      async () => {
        const service =
          createGrowthSocialChannelsService({
            getEndpoint:
              () =>
                'https://bridge.example.test',
            getIdToken:
              async () =>
                'opaque-id-token',
            fetcher:
              async () =>
                jsonResponse(
                  {
                    ok: false,
                    code:
                      'SOCIAL_BRIDGE_NOT_AUTHORIZED',
                  },
                  403,
                ),
          });

        await expect(
          service.listProfiles(),
        ).rejects.toThrow(
          'SOCIAL_BRIDGE_NOT_AUTHORIZED',
        );
      },
    );
  },
);