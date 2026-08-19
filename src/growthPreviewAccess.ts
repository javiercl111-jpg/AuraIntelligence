export interface GrowthPreviewAccessInput {
  isDevelopment: boolean;
  productSurface: string;
  configuredBypass:
    | string
    | boolean
    | undefined
    | null;
}

export const resolveGrowthPreviewAccess = (
  input: GrowthPreviewAccessInput,
): boolean =>
  input.isDevelopment === true &&
  input.productSurface === 'growth' &&
  input.configuredBypass === 'true';

export const getGrowthPreviewAccess =
  (): boolean =>
    resolveGrowthPreviewAccess({
      isDevelopment: import.meta.env.DEV,
      productSurface:
        import.meta.env.VITE_AURA_PRODUCT_SURFACE ??
        '',
      configuredBypass:
        import.meta.env
          .VITE_AURA_GROWTH_PREVIEW_AUTH_BYPASS,
    });
