export type AuraProductSurface =
  | 'growth'
  | 'intelligence';

export type AuraResolvedProductSurface =
  | AuraProductSurface
  | 'invalid';

export interface ProductSurfaceAuthorityInput {
  readonly configuredSurface:
    | string
    | boolean
    | undefined
    | null;
  readonly hostname:
    | string
    | undefined
    | null;
  readonly isDevelopment: boolean;
}

const GROWTH_SURFACE = 'growth';
const INTELLIGENCE_SURFACE = 'intelligence';

const GROWTH_HOST =
  'growth.auranexus.io';

const INTELLIGENCE_HOST =
  'intelligence.auranexus.io';

const normalizeHostname = (
  hostname:
    | string
    | undefined
    | null,
): string =>
  (hostname ?? '')
    .trim()
    .toLowerCase();

const resolveConfiguredSurface = (
  configuredSurface:
    | string
    | boolean
    | undefined
    | null,
): AuraResolvedProductSurface => {
  if (configuredSurface === GROWTH_SURFACE) {
    return 'growth';
  }

  if (configuredSurface === INTELLIGENCE_SURFACE) {
    return 'intelligence';
  }

  return 'invalid';
};

export function resolveProductSurfaceAuthority(
  input: ProductSurfaceAuthorityInput,
): AuraResolvedProductSurface {
  const configured =
    resolveConfiguredSurface(
      input.configuredSurface,
    );

  if (configured === 'invalid') {
    return 'invalid';
  }

  if (input.isDevelopment) {
    return configured;
  }

  const hostname =
    normalizeHostname(input.hostname);

  if (
    configured === 'growth' &&
    hostname === GROWTH_HOST
  ) {
    return 'growth';
  }

  if (
    configured === 'intelligence' &&
    hostname === INTELLIGENCE_HOST
  ) {
    return 'intelligence';
  }

  return 'invalid';
}

export function resolveDevelopmentProductSurface(
  configuredSurface:
    | string
    | boolean
    | undefined
    | null,
): AuraResolvedProductSurface {
  return resolveProductSurfaceAuthority({
    configuredSurface,
    hostname: undefined,
    isDevelopment: true,
  });
}

export function getDevelopmentProductSurface():
  AuraResolvedProductSurface {
  return resolveProductSurfaceAuthority({
    configuredSurface:
      import.meta.env.VITE_AURA_PRODUCT_SURFACE,
    hostname:
      typeof window !== 'undefined'
        ? window.location.hostname
        : undefined,
    isDevelopment:
      import.meta.env.DEV,
  });
}
