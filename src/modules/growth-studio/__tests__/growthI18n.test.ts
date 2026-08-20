import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  DEFAULT_GROWTH_LOCALE,
  getGrowthMessages,
  resolveGrowthLocale,
} from '../i18n/growthI18n';

describe(
  'Aura Growth bilingual UX foundation',
  () => {
    it('uses Spanish as the default locale', () => {
      expect(
        DEFAULT_GROWTH_LOCALE,
      ).toBe('es');

      expect(
        resolveGrowthLocale(undefined),
      ).toBe('es');
    });

    it('supports explicit English', () => {
      expect(
        resolveGrowthLocale('en'),
      ).toBe('en');
    });

    it('fails closed to Spanish for unsupported locale values', () => {
      expect(
        resolveGrowthLocale('fr'),
      ).toBe('es');

      expect(
        resolveGrowthLocale('EN'),
      ).toBe('es');
    });

    it('provides Spanish commercial navigation', () => {
      const messages =
        getGrowthMessages('es');

      expect(
        messages.nav.overview,
      ).toBe('Resumen');

      expect(
        messages.nav.opportunities,
      ).toBe('Oportunidades');

      expect(
        messages.nav.settings,
      ).toBe('Configuración');
    });

    it('provides English commercial navigation', () => {
      const messages =
        getGrowthMessages('en');

      expect(
        messages.nav.overview,
      ).toBe('Overview');

      expect(
        messages.nav.opportunities,
      ).toBe('Opportunities');

      expect(
        messages.nav.settings,
      ).toBe('Settings');
    });

    it('preserves Aura Growth and Growth Advisor as product names', () => {
      const es =
        getGrowthMessages('es');

      const en =
        getGrowthMessages('en');

      expect(
        es.nav.advisor,
      ).toBe('Growth Advisor');

      expect(
        en.nav.advisor,
      ).toBe('Growth Advisor');
    });
  },
);
