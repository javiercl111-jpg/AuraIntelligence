import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveDevelopmentProductSurface,
} from '../productSurface';

describe(
  'development product surface resolver',
  () => {
    it('selects Growth only for the explicit growth value', () => {
      expect(
        resolveDevelopmentProductSurface('growth'),
      ).toBe('growth');
    });

    it('fails closed to Intelligence for undefined configuration', () => {
      expect(
        resolveDevelopmentProductSurface(undefined),
      ).toBe('intelligence');
    });

    it('does not treat feature-like boolean values as Growth authority', () => {
      expect(
        resolveDevelopmentProductSurface(true),
      ).toBe('intelligence');

      expect(
        resolveDevelopmentProductSurface(false),
      ).toBe('intelligence');
    });

    it('does not accept arbitrary product values', () => {
      expect(
        resolveDevelopmentProductSurface('AURA_GROWTH'),
      ).toBe('intelligence');

      expect(
        resolveDevelopmentProductSurface('admin'),
      ).toBe('intelligence');

      expect(
        resolveDevelopmentProductSurface('true'),
      ).toBe('intelligence');
    });
  },
);
