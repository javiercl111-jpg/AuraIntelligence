import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  GrowthI18nProvider,
} from '../i18n/GrowthI18nProvider';

import GrowthLanguageSelector from '../i18n/GrowthLanguageSelector';

describe(
  'GrowthLanguageSelector',
  () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('starts with Spanish selected', () => {
      render(
        <GrowthI18nProvider>
          <GrowthLanguageSelector />
        </GrowthI18nProvider>,
      );

      expect(
        screen.getByRole(
          'button',
          { name: 'ES' },
        ),
      ).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      expect(
        screen.getByRole(
          'button',
          { name: 'EN' },
        ),
      ).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('changes the active language to English', () => {
      render(
        <GrowthI18nProvider>
          <GrowthLanguageSelector />
        </GrowthI18nProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          { name: 'EN' },
        ),
      );

      expect(
        screen.getByRole(
          'button',
          { name: 'EN' },
        ),
      ).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      expect(
        window.localStorage.getItem(
          'aura_growth_locale',
        ),
      ).toBe('en');
    });
  },
);
