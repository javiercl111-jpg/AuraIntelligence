import type {
  AuraNavigationAction,
  AuraNavigationResult,
} from '../types/auraNavigation';

const AURA_HCM_BASE_URL = 'https://www.aurahcm.com';

const normalizeRoute = (route?: string): string => {
  if (!route) return '/';

  return route.startsWith('/') ? route : `/${route}`;
};

export const buildAuraHCMNavigationUrl = (route?: string): string => {
  const cleanRoute = normalizeRoute(route);

  return `${AURA_HCM_BASE_URL}${cleanRoute}`;
};

export const executeAuraHCMNavigation = (
  action: AuraNavigationAction
): AuraNavigationResult => {
  if (action.system !== 'aura_hcm') {
    return {
      canNavigate: false,
      reason: 'La acción no pertenece a Aura HCM.',
      action,
    };
  }

  if (!action.route) {
    return {
      canNavigate: false,
      reason: 'La acción no tiene ruta configurada.',
      action,
    };
  }

  const url = buildAuraHCMNavigationUrl(action.route);

  window.open(url, '_blank', 'noopener,noreferrer');

  return {
    canNavigate: true,
    action,
    target: {
      system: 'aura_hcm',
      route: action.route,
      label: action.label,
      externalUrl: url,
      openMode: 'new_tab',
    },
  };
};