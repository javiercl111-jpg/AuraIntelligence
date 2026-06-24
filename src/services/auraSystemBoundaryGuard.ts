import type {
    AuraSystem,
  } from '../types/auraIntelligence';
  
  export interface AuraSystemBoundaryResult {
    allowed: boolean;
    effectiveSystem: AuraSystem;
    reason?: string;
    requiresClarification: boolean;
  }
  
  const isKnownSystem = (
    system?: string
  ): system is AuraSystem => {
    return (
      system === 'aura_hcm' ||
      system === 'aura_maintenance' ||
      system === 'aura_signature' ||
      system === 'aura_control_center' ||
      system === 'aura_intelligence'
    );
  };
  
  export const evaluateAuraSystemBoundary = ({
    detectedSystem,
    contextSystem,
    allowCrossSystem = false,
  }: {
    detectedSystem?: string;
    contextSystem: AuraSystem;
    allowCrossSystem?: boolean;
  }): AuraSystemBoundaryResult => {
    if (!detectedSystem || detectedSystem === 'unknown') {
      return {
        allowed: true,
        effectiveSystem: contextSystem,
        requiresClarification: false,
      };
    }
  
    if (!isKnownSystem(detectedSystem)) {
      return {
        allowed: true,
        effectiveSystem: contextSystem,
        requiresClarification: false,
      };
    }
  
    if (detectedSystem === contextSystem) {
      return {
        allowed: true,
        effectiveSystem: detectedSystem,
        requiresClarification: false,
      };
    }
  
    if (allowCrossSystem) {
      return {
        allowed: true,
        effectiveSystem: detectedSystem,
        requiresClarification: false,
        reason:
          'Consulta explícitamente multi-sistema permitida.',
      };
    }
  
    return {
      allowed: false,
      effectiveSystem: contextSystem,
      requiresClarification: true,
      reason:
        `La pregunta parece pertenecer a ${detectedSystem} pero el contexto actual es ${contextSystem}.`,
    };
  };
  
  export const isCrossSystemQuestion = (
    question: string
  ): boolean => {
    const text = String(question || '').toLowerCase();
  
    return (
      text.includes('resumen general') ||
      text.includes('todo aura') ||
      text.includes('ecosistema aura') ||
      text.includes('todos los sistemas') ||
      text.includes('hcm y maintenance') ||
      text.includes('maintenance y hcm') ||
      text.includes('hcm y signature') ||
      text.includes('signature y hcm') ||
      text.includes('todos mis pendientes')
    );
  };