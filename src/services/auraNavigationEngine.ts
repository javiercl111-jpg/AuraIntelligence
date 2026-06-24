import type {
  AuraNavigationAction,
  AuraNavigationResult,
} from '../types/auraNavigation';

const SYSTEM_BASE_PATHS: Record<string, string> = {
  aura_hcm: '',
  aura_maintenance: '',
  aura_signature: '',
  aura_control_center: '',
  aura_intelligence: '',
};

export const resolveAuraNavigationTarget = (
  action: AuraNavigationAction
): AuraNavigationResult => {
  if (!action.route) {
    return {
      canNavigate: false,
      reason: 'La acción no tiene ruta configurada.',
      action,
    };
  }

  const basePath = SYSTEM_BASE_PATHS[action.system] || '';
  const route = `${basePath}${action.route}`;

  return {
    canNavigate: true,
    action,
    target: {
      system: action.system,
      route,
      label: action.label,
      openMode: 'internal',
    },
  };
};

export const executeAuraNavigation = (
  action: AuraNavigationAction
): AuraNavigationResult => {
  const result = resolveAuraNavigationTarget(action);

  if (!result.canNavigate || !result.target) {
    return result;
  }

  window.history.pushState({}, '', result.target.route);
  window.dispatchEvent(new PopStateEvent('popstate'));

  return result;
};