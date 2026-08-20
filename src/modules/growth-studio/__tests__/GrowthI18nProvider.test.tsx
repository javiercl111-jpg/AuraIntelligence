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
  useGrowthI18n,
} from '../i18n/GrowthI18nProvider';

function LanguageProbe() {
  const {
    locale,
    messages,
    setLocale,
  } = useGrowthI18n();

  return (
    <div>
      <span data-testid="locale">
        {locale}
      </span>

      <span data-testid="overview">
        {messages.nav.overview}
      </span>

      <button
        type="button"
        onClick={() =>
          setLocale('en')
        }
      >
        English
      </button>

      <button
        type="button"
        onClick={() =>
          setLocale('es')
        }
      >
        Español
      </button>
    </div>
  );
}

describe(
  'GrowthI18nProvider',
  () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('starts in Spanish by default', () => {
      render(
        <GrowthI18nProvider>
          <LanguageProbe />
        </GrowthI18nProvider>,
      );

      expect(
        screen.getByTestId(
          'locale',
        ),
      ).toHaveTextContent('es');

      expect(
        screen.getByTestId(
          'overview',
        ),
      ).toHaveTextContent(
        'Resumen',
      );
    });

    it('switches to English at runtime', () => {
      render(
        <GrowthI18nProvider>
          <LanguageProbe />
        </GrowthI18nProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name: 'English',
          },
        ),
      );

      expect(
        screen.getByTestId(
          'locale',
        ),
      ).toHaveTextContent('en');

      expect(
        screen.getByTestId(
          'overview',
        ),
      ).toHaveTextContent(
        'Overview',
      );
    });

    it('switches back to Spanish', () => {
      render(
        <GrowthI18nProvider>
          <LanguageProbe />
        </GrowthI18nProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name: 'English',
          },
        ),
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name: 'Español',
          },
        ),
      );

      expect(
        screen.getByTestId(
          'locale',
        ),
      ).toHaveTextContent('es');
    });

    it('restores a valid stored language preference', () => {
      window.localStorage.setItem(
        'aura_growth_locale',
        'en',
      );

      render(
        <GrowthI18nProvider>
          <LanguageProbe />
        </GrowthI18nProvider>,
      );

      expect(
        screen.getByTestId(
          'locale',
        ),
      ).toHaveTextContent('en');
    });

    it('fails closed to Spanish for an invalid stored value', () => {
      window.localStorage.setItem(
        'aura_growth_locale',
        'fr',
      );

      render(
        <GrowthI18nProvider>
          <LanguageProbe />
        </GrowthI18nProvider>,
      );

      expect(
        screen.getByTestId(
          'locale',
        ),
      ).toHaveTextContent('es');
    });
  },
);
