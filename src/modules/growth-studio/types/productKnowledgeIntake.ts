/**
 * Product knowledge captured before building a canonical ProductContext.
 *
 * This contract represents acquisition state only.
 * It is NOT a persisted ProductContext and does not imply that
 * any supplied knowledge is confirmed.
 */

export type ProductKnowledgeStatus =
  | 'confirmed'
  | 'inferred'
  | 'missing';

export type ProductKnowledgeSource =
  | 'user'
  | 'product_document'
  | 'company_website'
  | 'product_website'
  | 'intelligence'
  | 'other';

export interface ProductKnowledgeEvidence {
  readonly id: string;
  readonly sourceType: ProductKnowledgeSource;
  readonly sourceRef?: string;
  readonly label: string;
  readonly capturedAt: string;
}

export interface ProductKnowledgeValue<T> {
  value: T | null;
  status: ProductKnowledgeStatus;
  confidence: number;
  evidenceIds: string[];
}

/**
 * Minimum product knowledge that Growth may acquire before
 * constructing ProductContext.
 *
 * Missing information must remain explicitly missing.
 */
export interface ProductKnowledgeIntake {
  readonly tenantId: string;
  readonly companyId: string;

  name: ProductKnowledgeValue<string>;
  category: ProductKnowledgeValue<string>;
  description: ProductKnowledgeValue<string>;

  problemsSolved: ProductKnowledgeValue<string[]>;
  capabilities: ProductKnowledgeValue<string[]>;
  benefits: ProductKnowledgeValue<string[]>;

  idealCustomerProfiles: ProductKnowledgeValue<string[]>;
  targetIndustries: ProductKnowledgeValue<string[]>;
  useCases: ProductKnowledgeValue<string[]>;

  differentiators: ProductKnowledgeValue<string[]>;

  commercialEvidence: ProductKnowledgeValue<string[]>;
  claimsRestrictions: ProductKnowledgeValue<string[]>;
  preferredMessages: ProductKnowledgeValue<string[]>;

  websiteUrl: ProductKnowledgeValue<string>;
  pricingContext: ProductKnowledgeValue<string>;

  evidence: ProductKnowledgeEvidence[];

  readonly capturedAt: string;
  updatedAt: string;
}

/**
 * Fields required before Growth may claim that it understands
 * the product sufficiently for strategy construction.
 *
 * This is acquisition policy, not outreach authorization.
 */
export const PRODUCT_KNOWLEDGE_STRATEGY_REQUIRED_FIELDS = [
  'name',
  'description',
  'problemsSolved',
  'benefits',
  'idealCustomerProfiles',
] as const;

/**
 * Fields that require confirmed/evidence-backed knowledge before
 * they should be used as authoritative commercial claims.
 */
export const PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS = [
  'benefits',
  'commercialEvidence',
  'pricingContext',
] as const;
