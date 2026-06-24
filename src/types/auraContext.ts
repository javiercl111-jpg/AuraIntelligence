import type {
    AuraLanguage,
    AuraSystem,
    AuraUserRole,
  } from './auraIntelligence';
  
  export type AuraContextSource =
    | 'manual'
    | 'widget'
    | 'route'
    | 'system'
    | 'integration';
  
  export interface AuraRuntimeContext {
    tenantId: string;
    companyId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    role?: AuraUserRole;
    profileId?: string;
    permissions?: string[];
    system: AuraSystem;
    module?: string;
    route?: string;
    language: AuraLanguage;
    source: AuraContextSource;
    createdAt: string;
  }
  
  export interface AuraResolvedContext {
    tenantId: string;
    companyId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    role?: AuraUserRole;
    profileId?: string;
    permissions: string[];
    system: AuraSystem;
    module?: string;
    route?: string;
    language: AuraLanguage;
    source: AuraContextSource;
    confidence: number;
    warnings: string[];
  }
  
  export interface AuraContextResolutionInput {
    fallbackContext: AuraRuntimeContext;
    detectedSystem?: AuraSystem | 'unknown';
    detectedModule?: string;
  }