import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_GROWTH_LOCALE,
  getGrowthMessages,
  resolveGrowthLocale,
  type GrowthLocale,
} from './growthI18n';

const STORAGE_KEY =
  'aura_growth_locale';

interface GrowthI18nContextValue {
  locale: GrowthLocale;
  messages: ReturnType<
    typeof getGrowthMessages
  >;
  setLocale: (
    locale: GrowthLocale,
  ) => void;
}

const GrowthI18nContext =
  createContext<
    GrowthI18nContextValue | undefined
  >(undefined);

const readStoredLocale =
  (): GrowthLocale => {
    if (
      typeof window === 'undefined'
    ) {
      return DEFAULT_GROWTH_LOCALE;
    }

    try {
      return resolveGrowthLocale(
        window.localStorage.getItem(
          STORAGE_KEY,
        ),
      );
    } catch {
      return DEFAULT_GROWTH_LOCALE;
    }
  };

export function GrowthI18nProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<GrowthLocale>(
      readStoredLocale,
    );

  const setLocale = (
    nextLocale: GrowthLocale,
  ) => {
    const resolved =
      resolveGrowthLocale(
        nextLocale,
      );

    setLocaleState(resolved);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        resolved,
      );
    } catch {
      // UX preference persistence is optional.
    }
  };

  const value =
    useMemo(
      () => ({
        locale,
        messages:
          getGrowthMessages(locale),
        setLocale,
      }),
      [locale],
    );

  return (
    <GrowthI18nContext.Provider
      value={value}
    >
      {children}
    </GrowthI18nContext.Provider>
  );
}

export const useGrowthI18n =
  (): GrowthI18nContextValue => {
    const context =
      useContext(
        GrowthI18nContext,
      );

    if (!context) {
      throw new Error(
        'useGrowthI18n must be used inside GrowthI18nProvider.',
      );
    }

    return context;
  };
