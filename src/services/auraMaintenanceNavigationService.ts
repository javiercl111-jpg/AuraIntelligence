import type {
    AuraNavigationAction,
    AuraNavigationResult,
  } from '../types/auraNavigation';
  
  const AURA_MAINTENANCE_BASE_URL =
    'https://aura-maintenance-os.vercel.app';
  
  const normalizeRoute = (route?: string): string => {
    if (!route) return '/';
  
    return route.startsWith('/') ? route : `/${route}`;
  };
  
  export const buildAuraMaintenanceNavigationUrl = (
    route?: string
  ): string => {
    const cleanRoute = normalizeRoute(route);
  
    return `${AURA_MAINTENANCE_BASE_URL}${cleanRoute}`;
  };
  
  export const executeAuraMaintenanceNavigation = (
    action: AuraNavigationAction
  ): AuraNavigationResult => {
    if (action.system !== 'aura_maintenance') {
      return {
        canNavigate: false,
        reason: 'La acción no pertenece a Aura Maintenance OS.',
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
  
    const url = buildAuraMaintenanceNavigationUrl(action.route);
  
    window.open(url, '_blank', 'noopener,noreferrer');
  
    return {
      canNavigate: true,
      action,
      target: {
        system: 'aura_maintenance',
        route: action.route,
        label: action.label,
        externalUrl: url,
        openMode: 'new_tab',
      },
    };
  };