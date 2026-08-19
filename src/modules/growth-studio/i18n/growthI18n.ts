import {
  growthEn,
} from './en';
import {
  growthEs,
} from './es';

export type GrowthLocale =
  | 'es'
  | 'en';

export const DEFAULT_GROWTH_LOCALE:
  GrowthLocale = 'es';

export const resolveGrowthLocale = (
  value:
    | string
    | undefined
    | null,
): GrowthLocale =>
  value === 'en'
    ? 'en'
    : 'es';

export const getGrowthMessages = (
  locale: GrowthLocale,
) =>
  locale === 'en'
    ? growthEn
    : growthEs;
