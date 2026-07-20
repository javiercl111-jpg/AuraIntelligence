// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Campaign Strategy Lite
// ─────────────────────────────────────────────────────────────

import type { KnowledgeGap } from './brandBrain';

export type CampaignStrategyFieldStatus = 'confirmed' | 'inferred' | 'missing';

export interface CampaignStrategyField<T> {
  value: T | null;
  status: CampaignStrategyFieldStatus;
  source?: string;
  evidence?: string;
}

export interface Assumption {
  field: string;
  statement: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface StrategyRisk {
  type: 'business' | 'execution' | 'market';
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ExecutionConstraints {
  budget?: number;
  timeframe?: string;
  resources?: string[];
}

export interface CampaignStrategy {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;

  campaignObjective: CampaignStrategyField<string>;
  primaryAudience: CampaignStrategyField<string>;
  secondaryAudience: CampaignStrategyField<string>;
  coreMessage: CampaignStrategyField<string>;
  valueDrivers: CampaignStrategyField<string[]>;
  recommendedChannels: CampaignStrategyField<string[]>;
  recommendedContentTypes: CampaignStrategyField<string[]>;
  callsToAction: CampaignStrategyField<string[]>;

  executionConstraints?: ExecutionConstraints;

  assumptions: Assumption[];
  knowledgeGaps: KnowledgeGap[];
  strategyRisks: StrategyRisk[];

  /**
   * Represents the level of documentary backing.
   * Not a probability of success.
   * Replaced 'confidenceScore' as requested.
   */
  strategyEvidenceScore: number;

  /**
   * Represents readiness to launch based on completeness of core fields.
   */
  readinessScore: number;
  strategyReadinessReason: string;

  readonly createdAt: string;
  updatedAt: string;
}
