import type {
    AuraCopilotActionPlan,
  } from '../types/auraCopilotAction';
  
  import type {
    AuraSuggestedAction,
  } from '../types/auraAction';
  
  const createActionPlanId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  };
  
  export const buildAuraCopilotActionPlans = (
    suggestedActions: AuraSuggestedAction[]
  ): AuraCopilotActionPlan[] => {
    return suggestedActions.map((action) => ({
      id: createActionPlanId(),
      type: action.type === 'navigation' ? 'navigation' : 'recommendation',
      status: action.requiresConfirmation
        ? 'requires_confirmation'
        : 'suggested',
      confidence: action.confidence,
      requiresConfirmation: action.requiresConfirmation,
      payload: {
        system: action.system,
        moduleId: action.moduleId,
        route: action.route,
        title: action.label,
        description: action.description,
        fields: {},
      },
      safetyNotes: [
        action.requiresConfirmation
          ? 'Esta acción requiere confirmación antes de ejecutarse.'
          : 'Esta acción solo prepara o navega; no modifica datos sensibles.',
      ],
    }));
  };