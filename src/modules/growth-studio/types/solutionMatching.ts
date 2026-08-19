import type {
  ProductContextRef,
} from './growthCommercialContext';

export type ProductPortfolioStatus =
  | 'active'
  | 'preview'
  | 'coming_soon'
  | 'retired';

export interface ProductPortfolioEntry {
  readonly id: string;
  readonly productContext: ProductContextRef;

  readonly status: ProductPortfolioStatus;

  /**
   * Whether Growth may actively recommend this product
   * as part of a commercial solution.
   */
  readonly commerciallyRecommendable: boolean;

  /**
   * Optional commercial ordering only.
   * It MUST NOT be treated as matching evidence.
   */
  readonly portfolioPriority?: number;
}

export interface ProductPortfolio {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;

  readonly entries: ProductPortfolioEntry[];

  readonly version: number;
  readonly updatedAt: string;
}

/**
 * Normalized prospect signal consumed by matching.
 *
 * Growth does not own the source system.
 * sourceAuthority preserves the external authority boundary.
 */
export interface SolutionMatchingSignal {
  readonly id: string;

  readonly kind:
    | 'industry'
    | 'company_size'
    | 'operational_need'
    | 'business_problem'
    | 'required_capability'
    | 'declared_interest'
    | 'commercial_intent'
    | 'other';

  readonly value: string;

  readonly status:
    | 'confirmed'
    | 'inferred';

  readonly confidence: number;

  readonly sourceAuthority:
    | 'control_center'
    | 'intelligence'
    | 'manual';

  readonly sourceRef?: string;
}

/**
 * Evidence explaining why a product received matching score.
 */
export interface SolutionMatchEvidence {
  readonly id: string;
  readonly signalId: string;
  readonly productContextId: string;

  readonly dimension:
    | 'problem_fit'
    | 'capability_fit'
    | 'customer_fit'
    | 'industry_fit'
    | 'use_case_fit'
    | 'declared_interest'
    | 'other';

  readonly contribution: number;
  readonly explanation: string;
}

export interface ProductSolutionCandidate {
  readonly productContext: ProductContextRef;

  /**
   * 0-100 explainable matching score.
   */
  readonly score: number;

  /**
   * Confidence in the recommendation itself.
   * Separate from score.
   */
  readonly confidence: number;

  readonly evidenceIds: string[];

  readonly matchedDimensions: string[];
  readonly knowledgeGaps: string[];

  readonly recommendationStatus:
    | 'recommended'
    | 'possible'
    | 'insufficient_evidence'
    | 'not_recommended';
}

export interface SolutionBundleItem {
  readonly productContext: ProductContextRef;

  readonly role:
    | 'primary'
    | 'supporting';

  readonly reason: string;
}

export interface SolutionBundle {
  readonly id: string;

  readonly items: SolutionBundleItem[];

  /**
   * Bundle score is independent from the sum of product scores.
   * More products must never automatically increase the score.
   */
  readonly score: number;

  readonly confidence: number;

  readonly rationale: string;

  readonly evidenceIds: string[];
}

export type CommercialRecommendationDecision =
  | 'single_product'
  | 'solution_bundle'
  | 'more_discovery_required'
  | 'no_recommendation';

export interface CommercialSolutionRecommendation {
  readonly id: string;

  readonly tenantId: string;
  readonly companyId: string;

  readonly decision: CommercialRecommendationDecision;

  readonly candidates: ProductSolutionCandidate[];

  readonly primaryProduct?: ProductContextRef;
  readonly bundle?: SolutionBundle;

  readonly evidence: SolutionMatchEvidence[];

  readonly knowledgeGaps: string[];

  readonly confidence: number;

  readonly generatedAt: string;
}
