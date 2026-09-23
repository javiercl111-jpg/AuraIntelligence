import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveDevelopmentProductSurface,
  resolveProductSurfaceAuthority,
} from '../productSurface';

describe(
  'product surface authority resolver',
  () => {
    it('selects Growth for explicit Growth in development', () => {
      expect(
        resolveDevelopmentProductSurface(
          'growth',
        ),
      ).toBe('growth');
    });

    it('selects Intelligence for explicit Intelligence in development', () => {
      expect(
        resolveDevelopmentProductSurface(
          'intelligence',
        ),
      ).toBe('intelligence');
    });

    it('fails closed for missing development configuration', () => {
      expect(
        resolveDevelopmentProductSurface(
          undefined,
        ),
      ).toBe('invalid');
    });

    it('fails closed for boolean and arbitrary development configuration', () => {
      expect(
        resolveDevelopmentProductSurface(
          true,
        ),
      ).toBe('invalid');

      expect(
        resolveDevelopmentProductSurface(
          false,
        ),
      ).toBe('invalid');

      expect(
        resolveDevelopmentProductSurface(
          'AURA_GROWTH',
        ),
      ).toBe('invalid');

      expect(
        resolveDevelopmentProductSurface(
          'admin',
        ),
      ).toBe('invalid');

      expect(
        resolveDevelopmentProductSurface(
          'true',
        ),
      ).toBe('invalid');
    });

    it('allows Growth only on the Growth production hostname', () => {
      expect(
        resolveProductSurfaceAuthority({
          configuredSurface: 'growth',
          hostname:
            'growth.auranexus.io',
          isDevelopment: false,
        }),
      ).toBe('growth');
    });

    it('allows Intelligence only on the Intelligence production hostname', () => {
      expect(
        resolveProductSurfaceAuthority({
          configuredSurface:
            'intelligence',
          hostname:
            'intelligence.auranexus.io',
          isDevelopment: false,
        }),
      ).toBe('intelligence');
    });

    it('fails closed when Growth configuration is served from the Intelligence hostname', () => {
      expect(
        resolveProductSurfaceAuthority({
          configuredSurface: 'growth',
          hostname:
            'intelligence.auranexus.io',
          isDevelopment: false,
        }),
      ).toBe('invalid');
    });

    it('fails closed when Intelligence configuration is served from the Growth hostname', () => {
      expect(
        resolveProductSurfaceAuthority({
          configuredSurface:
            'intelligence',
          hostname:
            'growth.auranexus.io',
          isDevelopment: false,
        }),
      ).toBe('invalid');
    });

    it('fails closed for unknown production hostnames', () => {
      expect(
        resolveProductSurfaceAuthority({
          configuredSurface: 'growth',
          hostname:
            'example.com',
          isDevelopment: false,
        }),
      ).toBe('invalid');

      expect(
        resolveProductSurfaceAuthority({
          configuredSurface:
            'intelligence',
          hostname:
            'example.com',
          isDevelopment: false,
        }),
      ).toBe('invalid');
    });

    it('normalizes production hostname casing and whitespace', () => {
      expect(
        resolveProductSurfaceAuthority({
          configuredSurface: 'growth',
          hostname:
            '  GROWTH.AURANEXUS.IO  ',
          isDevelopment: false,
        }),
      ).toBe('growth');

    });

  it('allows Growth on the certified remote Preview host with explicit remote Preview authority', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'growth',
        hostname: 'aura-growth-plr3xdtg0-javiers-projects-eab33ae8.vercel.app',
        isDevelopment: false,
        remoteGrowthPreviewAuthority: 'true',
      }),
    ).toBe('growth');
  });

  it('fails closed on the certified remote Preview host when authority is missing', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'growth',
        hostname: 'aura-growth-plr3xdtg0-javiers-projects-eab33ae8.vercel.app',
        isDevelopment: false,
      }),
    ).toBe('invalid');
  });

  it('fails closed on the certified remote Preview host when authority is false', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'growth',
        hostname: 'aura-growth-plr3xdtg0-javiers-projects-eab33ae8.vercel.app',
        isDevelopment: false,
        remoteGrowthPreviewAuthority: 'false',
      }),
    ).toBe('invalid');
  });

  it('fails closed for an unrelated Vercel host even with remote Preview authority', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'growth',
        hostname: 'unrelated-project.vercel.app',
        isDevelopment: false,
        remoteGrowthPreviewAuthority: 'true',
      }),
    ).toBe('invalid');
  });

  it('fails closed for Intelligence on the Growth remote Preview namespace', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'intelligence',
        hostname: 'aura-growth-plr3xdtg0-javiers-projects-eab33ae8.vercel.app',
        isDevelopment: false,
        remoteGrowthPreviewAuthority: 'true',
      }),
    ).toBe('invalid');
  });

  it('fails closed for a non-Vercel host even with remote Preview authority', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'growth',
        hostname: 'growth-preview.example.com',
        isDevelopment: false,
        remoteGrowthPreviewAuthority: 'true',
      }),
    ).toBe('invalid');
  });

  it('preserves the production Growth host without remote Preview authority', () => {
    expect(
      resolveProductSurfaceAuthority({
        configuredSurface: 'growth',
        hostname: 'growth.auranexus.io',
        isDevelopment: false,
      }),
    ).toBe('growth');
  });
  },
);
