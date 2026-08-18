export type AuraProductSurface =
  | 'growth'
  | 'intelligence';

const GROWTH_SURFACE = 'growth';

export function resolveDevelopmentProductSurface(
  configuredSurface:
    | string
    | boolean
    | undefined
    | null,
): AuraProductSurface {
  return configuredSurface === GROWTH_SURFACE
    ? 'growth'
    : 'intelligence';
}

export function getDevelopmentProductSurface():
  AuraProductSurface {
  return resolveDevelopmentProductSurface(
    import.meta.env.VITE_AURA_PRODUCT_SURFACE,
  );
}
