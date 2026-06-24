export type AuraAIProvider =
  | 'local_mock'
  | 'openai'
  | 'azure_openai'
  | 'anthropic'
  | 'gemini';

export type AuraUsageMode =
  | 'knowledge_only'
  | 'hybrid'
  | 'ai_full';

export interface AuraUsageRecord {
  id?: string;

  tenantId: string;
  companyId: string;
  userId: string;

  provider: AuraAIProvider;
  model: string;

  mode: AuraUsageMode;

  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  estimatedCostUsd: number;

  cacheHit: boolean;

  question: string;

  createdAt: string;
}

export interface AuraCompanyUsageLimits {
  companyId: string;

  dailyTokenLimit: number;
  monthlyTokenLimit: number;

  dailyRequestLimit: number;
  monthlyRequestLimit: number;

  aiEnabled: boolean;

  preferredProvider: AuraAIProvider;
  preferredModel: string;

  lowCostModeEnabled: boolean;
}

export interface AuraUserUsageSummary {
  userId: string;

  requestsToday: number;
  requestsThisMonth: number;

  tokensToday: number;
  tokensThisMonth: number;

  estimatedCostUsdMonth: number;
}

export interface AuraUsageValidationResult {
  allowed: boolean;

  reason?: string;

  mode: AuraUsageMode;

  companyRemainingTokens?: number;
  companyRemainingRequests?: number;
}