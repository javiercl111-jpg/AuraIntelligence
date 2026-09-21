import {
  renderToStaticMarkup,
} from 'react-dom/server';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock(
  '../services/growthSocialChannelsService',
  () => ({
    growthSocialChannelsService: {
      listProfiles:
        vi.fn(
          async () =>
            [],
        ),
      upsertProfile:
        vi.fn(),
    },
    isGrowthSocialBridgeConfigured:
      () =>
        false,
  }),
);

import GrowthSocialChannelsSettings from '../product/GrowthSocialChannelsSettings';

describe(
  'AGFC01 | GrowthSocialChannelsSettings',
  () => {
    it(
      'renders the three governed target channels and keeps OAuth and publishing disabled',
      () => {
        const html =
          renderToStaticMarkup(
            <GrowthSocialChannelsSettings
              bridgeConfigured={
                false
              }
            />,
          );

        expect(
          html,
        ).toContain(
          'LinkedIn',
        );

        expect(
          html,
        ).toContain(
          'Facebook',
        );

        expect(
          html,
        ).toContain(
          'Instagram',
        );

        expect(
          html,
        ).toContain(
          'ORGANIZATION',
        );

        expect(
          html,
        ).toContain(
          'PAGE',
        );

        expect(
          html,
        ).toContain(
          'PROFILE',
        );

        expect(
          html,
        ).toContain(
          'OAuth no habilitado',
        );

        expect(
          html,
        ).toContain(
          'Publicación no habilitada',
        );

        expect(
          html,
        ).toContain(
          'CONNECTED no equivale a autorización OAuth',
        );
      },
    );
  },
);