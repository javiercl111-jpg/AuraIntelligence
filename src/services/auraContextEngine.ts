import type {
    AuraContextResolutionInput,
    AuraResolvedContext,
    AuraRuntimeContext,
  } from '../types/auraContext';
  
  import type {
    AuraSystem,
  } from '../types/auraIntelligence';
  
  const isKnownAuraSystem = (system?: string): system is AuraSystem => {
    return (
      system === 'aura_hcm' ||
      system === 'aura_maintenance' ||
      system === 'aura_signature' ||
      system === 'aura_control_center' ||
      system === 'aura_intelligence'
    );
  };
  
  const normalizePermissions = (permissions?: string[]): string[] => {
    if (!Array.isArray(permissions)) return [];
  
    return permissions
      .map((permission) => String(permission || '').trim())
      .filter(Boolean);
  };
  
  export const buildRuntimeContext = (
    context: Omit<AuraRuntimeContext, 'createdAt'>
  ): AuraRuntimeContext => {
    return {
      ...context,
      permissions: normalizePermissions(context.permissions),
      createdAt: new Date().toISOString(),
    };
  };
  
  export const resolveAuraContext = ({
    fallbackContext,
    detectedSystem,
    detectedModule,
  }: AuraContextResolutionInput): AuraResolvedContext => {
    const warnings: string[] = [];
  
    let confidence = 0.6;
  
    const resolvedSystem = isKnownAuraSystem(detectedSystem)
      ? detectedSystem
      : fallbackContext.system;
  
    if (detectedSystem && detectedSystem !== 'unknown') {
      confidence += 0.2;
    }
  
    if (detectedSystem && detectedSystem !== 'unknown' && detectedSystem !== fallbackContext.system) {
      warnings.push(
        `La pregunta parece pertenecer a ${detectedSystem}, aunque el contexto actual es ${fallbackContext.system}.`
      );
    }
  
    const resolvedModule = detectedModule || fallbackContext.module;
  
    if (resolvedModule) {
      confidence += 0.1;
    }
  
    if (!fallbackContext.userId) {
      warnings.push('No se recibió userId en el contexto.');
      confidence -= 0.2;
    }
  
    if (!fallbackContext.companyId) {
      warnings.push('No se recibió companyId en el contexto.');
      confidence -= 0.2;
    }
  
    return {
      tenantId: fallbackContext.tenantId,
      companyId: fallbackContext.companyId,
      userId: fallbackContext.userId,
      userEmail: fallbackContext.userEmail,
      userName: fallbackContext.userName,
      role: fallbackContext.role,
      profileId: fallbackContext.profileId,
      permissions: normalizePermissions(fallbackContext.permissions),
      system: resolvedSystem,
      module: resolvedModule,
      route: fallbackContext.route,
      language: fallbackContext.language,
      source: fallbackContext.source,
      confidence: Math.max(0, Math.min(0.99, confidence)),
      warnings,
    };
  };