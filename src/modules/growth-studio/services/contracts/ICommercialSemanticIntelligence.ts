import type {
  ProductContext,
} from '../../types/growthCommercialContext';

import type {
  SolutionMatchEvidence,
  SolutionMatchingSignal,
} from '../../types/solutionMatching';

export type CommercialSemanticAnalysisStatus =
  | 'valid'
  | 'insufficient_context'
  | 'invalid_response'
  | 'provider_unavailable';

export interface CommercialSemanticTrace {
  /**
   * Opaque request identifier for audit correlation.
   * Growth must not derive commercial decisions from this metadata.
   */
  readonly requestId: string;

  readonly provider?: string;
  readonly model?: string;

  readonly durationMs?: number;
  readonly tokenUsage?: number;
}

export interface CommercialSemanticMatch {
  readonly signalId: string;
  readonly productContextId: string;

  readonly dimension:
    SolutionMatchEvidence['dimension'];

  /**
   * Semantic strength only, normalized to 0-100.
   *
   * This is NOT the final SolutionMatchingPolicy contribution.
   */
  readonly semanticStrength: number;

  /**
   * Confidence of the semantic interpretation, 0-100.
   */
  readonly confidence: number;

  readonly explanation: string;
}

export interface CommercialSemanticAnalysisRequest {
  readonly tenantId: string;
  readonly companyId: string;

  readonly signals: readonly SolutionMatchingSignal[];

  /**
   * Only commercially eligible ProductContexts should be supplied.
   */
  readonly products: readonly ProductContext[];

  readonly requestId: string;
}

export interface CommercialSemanticAnalysisResult {
  readonly status: CommercialSemanticAnalysisStatus;

  /**
   * Empty unless status === 'valid'.
   */
  readonly matches: readonly CommercialSemanticMatch[];

  /**
   * Missing or ambiguous information discovered during analysis.
   */
  readonly knowledgeGaps: readonly string[];

  readonly trace: CommercialSemanticTrace;
}

/**
 * Neutral commercial-semantic intelligence boundary.
 *
 * Growth owns:
 * - ProductContext
 * - SolutionMatchingSignal
 * - matching dimensions
 * - scoring policy
 * - commercial decision policy
 *
 * Intelligence owns:
 * - semantic interpretation
 * - provider/model execution
 *
 * Implementations MUST fail closed.
 */
export interface ICommercialSemanticIntelligence {
  analyze(
    request: CommercialSemanticAnalysisRequest,
  ): Promise<CommercialSemanticAnalysisResult>;

  isAvailable(): Promise<boolean>;
}
