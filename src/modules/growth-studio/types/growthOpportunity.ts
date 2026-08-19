import type {
  PublicationChannel,
} from './growthCampaign';

export type GrowthOpportunityStage =
  | 'discovered'
  | 'qualified'
  | 'engaged'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type GrowthOpportunityPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type GrowthOpportunitySource =
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'email'
  | 'website'
  | 'campaign'
  | 'referral'
  | 'manual'
  | 'other';

export type GrowthOpportunitySignalType =
  | 'engagement'
  | 'intent'
  | 'fit'
  | 'timing'
  | 'relationship'
  | 'campaign_response'
  | 'manual_evidence'
  | 'other';

export interface GrowthOpportunityProspect {
  name: string;
  company: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface GrowthOpportunitySignal {
  readonly id: string;
  type: GrowthOpportunitySignalType;
  label: string;
  description: string;
  strength: number;
  observedAt: string;
}

export interface GrowthNextBestAction {
  title: string;
  description: string;
  priority: GrowthOpportunityPriority;
  channel?: PublicationChannel;
  dueAt?: string;
}

export interface GrowthOpportunityIntelligence {
  score: number;
  confidence: number;
  rationale: string;
  signals: GrowthOpportunitySignal[];
  nextBestAction: GrowthNextBestAction | null;
}

export interface GrowthOpportunity {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;

  prospect: GrowthOpportunityProspect;

  stage: GrowthOpportunityStage;
  priority: GrowthOpportunityPriority;

  estimatedValue: number | null;
  currency: string;

  ownerUserId: string | null;
  ownerDisplayName: string | null;

  source: GrowthOpportunitySource;
  sourceChannel: PublicationChannel | null;
  campaignId: string | null;

  intelligence: GrowthOpportunityIntelligence;

  expectedCloseAt: string | null;

  readonly schemaVersion: number;
  readonly createdAt: string;
  updatedAt: string;
}
