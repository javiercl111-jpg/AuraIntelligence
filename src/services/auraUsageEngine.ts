import type {
    AuraCompanyUsageLimits,
    AuraUsageMode,
    AuraUsageValidationResult,
  } from '../types/auraUsage';
  
  const DEFAULT_COMPANY_LIMITS: AuraCompanyUsageLimits = {
    companyId: 'aura_demo',
    dailyTokenLimit: 50_000,
    monthlyTokenLimit: 1_000_000,
    dailyRequestLimit: 500,
    monthlyRequestLimit: 10_000,
    aiEnabled: false,
    preferredProvider: 'local_mock',
    preferredModel: 'aura-local-mock-v1',
    lowCostModeEnabled: true,
  };
  
  export const getDefaultAuraUsageLimits = (): AuraCompanyUsageLimits => {
    return DEFAULT_COMPANY_LIMITS;
  };
  
  export const resolveAuraUsageMode = ({
    aiEnabled,
    lowCostModeEnabled,
    confidenceScore,
  }: {
    aiEnabled: boolean;
    lowCostModeEnabled: boolean;
    confidenceScore?: number;
  }): AuraUsageMode => {
    if (!aiEnabled) return 'knowledge_only';
  
    if (lowCostModeEnabled && typeof confidenceScore === 'number') {
      if (confidenceScore >= 75) {
        return 'knowledge_only';
      }
  
      return 'hybrid';
    }
  
    return 'ai_full';
  };
  
  export const validateAuraUsage = ({
    limits = DEFAULT_COMPANY_LIMITS,
    confidenceScore,
  }: {
    limits?: AuraCompanyUsageLimits;
    confidenceScore?: number;
  }): AuraUsageValidationResult => {
    if (!limits.aiEnabled) {
      return {
        allowed: true,
        mode: 'knowledge_only',
        reason: 'AI externa deshabilitada. Se usará Knowledge Base.',
      };
    }
  
    const mode = resolveAuraUsageMode({
      aiEnabled: limits.aiEnabled,
      lowCostModeEnabled: limits.lowCostModeEnabled,
      confidenceScore,
    });
  
    return {
      allowed: true,
      mode,
      companyRemainingTokens: limits.monthlyTokenLimit,
      companyRemainingRequests: limits.monthlyRequestLimit,
    };
  };
  
  export const estimateAuraTokenUsage = (text: string): number => {
    const cleanText = String(text || '').trim();
  
    if (!cleanText) return 0;
  
    return Math.ceil(cleanText.length / 4);
  };
  
  export const estimateAuraCostUsd = ({
    provider,
    promptTokens,
    completionTokens,
  }: {
    provider: string;
    promptTokens: number;
    completionTokens: number;
  }): number => {
    if (provider === 'local_mock') return 0;
  
    const estimatedInputCostPerMillion = 0.15;
    const estimatedOutputCostPerMillion = 0.6;
  
    const inputCost = (promptTokens / 1_000_000) * estimatedInputCostPerMillion;
    const outputCost =
      (completionTokens / 1_000_000) * estimatedOutputCostPerMillion;
  
    return Number((inputCost + outputCost).toFixed(6));
  };