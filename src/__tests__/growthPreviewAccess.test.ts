import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveGrowthPreviewAccess,
} from '../growthPreviewAccess';

describe(
  'Growth local preview access',
  () => {
    it('allows access only for explicit local Growth preview', () => {
      expect(
        resolveGrowthPreviewAccess({
          isDevelopment: true,
          productSurface: 'growth',
          configuredBypass: 'true',
        }),
      ).toBe(true);
    });

    it('fails closed outside development', () => {
      expect(
        resolveGrowthPreviewAccess({
          isDevelopment: false,
          productSurface: 'growth',
          configuredBypass: 'true',
        }),
      ).toBe(false);
    });

    it('fails closed for Intelligence surface', () => {
      expect(
        resolveGrowthPreviewAccess({
          isDevelopment: true,
          productSurface: 'intelligence',
          configuredBypass: 'true',
        }),
      ).toBe(false);
    });

    it('fails closed when bypass is absent', () => {
      expect(
        resolveGrowthPreviewAccess({
          isDevelopment: true,
          productSurface: 'growth',
          configuredBypass: undefined,
        }),
      ).toBe(false);
    });

    it('does not accept boolean or arbitrary truthy values', () => {
      expect(
        resolveGrowthPreviewAccess({
          isDevelopment: true,
          productSurface: 'growth',
          configuredBypass: true,
        }),
      ).toBe(false);

      expect(
        resolveGrowthPreviewAccess({
          isDevelopment: true,
          productSurface: 'growth',
          configuredBypass: 'yes',
        }),
      ).toBe(false);
    });
  },
);
