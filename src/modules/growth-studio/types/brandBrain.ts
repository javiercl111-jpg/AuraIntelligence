// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Brand Brain Lite
// ─────────────────────────────────────────────────────────────

export type BrandBrainFieldStatus = 'confirmed' | 'inferred' | 'missing';
export type BrandBrainConfidence = 'low' | 'medium' | 'high';

export interface BrandBrainField<T> {
  value: T | null;
  status: BrandBrainFieldStatus;
  confidence: BrandBrainConfidence;
  source?: string;
  evidence?: string;
}

export interface KnownFact {
  field: string;
  value: unknown;
  source?: string;
  status: BrandBrainFieldStatus;
}

export interface KnowledgeGap {
  field: string;
  label: string;
  importance: 'high' | 'medium' | 'low';
}

export interface CompanyProfile {
  companyName: BrandBrainField<string>;
  businessDescription: BrandBrainField<string>;
}

/**
 * Represents the Brand Identity extracted from conversation.
 */
export interface BrandBrain {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;

  companyProfile: CompanyProfile;
  industry: BrandBrainField<string>;
  products: BrandBrainField<string[]>;
  valueProposition: BrandBrainField<string>;
  targetAudience: BrandBrainField<string>;
  brandTone: BrandBrainField<string>;
  differentiators: BrandBrainField<string[]>;
  communicationStyle: BrandBrainField<string>;
  businessGoals: BrandBrainField<string[]>;

  knownFacts: KnownFact[];
  missingKnowledge: KnowledgeGap[];

  /**
   * "Nivel de conocimiento de marca" (0-100).
   * 100% for confirmed, 40% for inferred, 0% for missing.
   * Based on weighted fields.
   */
  confidenceScore: number;

  readonly createdAt: string;
  updatedAt: string;
}
