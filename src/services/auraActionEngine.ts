import {
    AURA_ACTIONS,
    type AuraSuggestedAction,
  } from '../types/auraAction';
  
  import type {
    AuraIntentDetectionResult,
  } from '../types/auraIntent';
  
  export const suggestAuraActions = (
    intent: AuraIntentDetectionResult
  ): AuraSuggestedAction[] => {
    if (intent.intentId === 'UNKNOWN') return [];
  
    return AURA_ACTIONS
      .filter((action) => {
        return (
          action.enabled &&
          action.intentIds.includes(intent.intentId)
        );
      })
      .map((action) => ({
        id: action.id,
        label: action.label,
        description: action.description,
        type: action.type,
        system: action.system,
        moduleId: action.moduleId,
        route: action.route,
        confidence: Math.min(0.99, intent.confidence),
        requiresConfirmation: action.requiresConfirmation,
      }));
  };