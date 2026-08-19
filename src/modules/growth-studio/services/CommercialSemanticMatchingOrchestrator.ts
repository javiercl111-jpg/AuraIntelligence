import type { ProductContext } from '../types/growthCommercialContext';
import type {
  CommercialSolutionRecommendation,
  ProductPortfolio,
  SolutionMatchingSignal,
} from '../types/solutionMatching';
import type {
  ICommercialSemanticIntelligence,
} from './contracts/ICommercialSemanticIntelligence';
import type {
  ComplementaryProductRelationship,
} from './CommercialSolutionDecisionEngine';

import {
  CommercialSemanticEvidencePolicy,
} from './CommercialSemanticEvidencePolicy';

import {
  CommercialSolutionDecisionEngine,
} from './CommercialSolutionDecisionEngine';

export interface CommercialSemanticMatchingInput {
  readonly portfolio: ProductPortfolio;
  readonly signals: SolutionMatchingSignal[];
  readonly products: ProductContext[];
  readonly complementaryRelationships: ComplementaryProductRelationship[];
  readonly requestId: string;
  readonly generatedAt: string;
}

export interface CommercialSemanticMatchingResult {
  readonly recommendation: CommercialSolutionRecommendation;
  readonly semanticStatus:
    | 'valid'
    | 'insufficient_context'
    | 'invalid_response'
    | 'provider_unavailable';
  readonly acceptedEvidenceCount: number;
  readonly rejectedSemanticMatches: number;
  readonly semanticKnowledgeGaps: string[];
}

export class CommercialSemanticMatchingOrchestrator {
  private readonly intelligence:
    ICommercialSemanticIntelligence;

  constructor(
    intelligence:
      ICommercialSemanticIntelligence,
  ) {
    this.intelligence =
      intelligence;
  }

  private failClosed(
    input: CommercialSemanticMatchingInput,
    semanticStatus: CommercialSemanticMatchingResult['semanticStatus'],
    semanticKnowledgeGaps: string[],
  ): CommercialSemanticMatchingResult {
    const recommendation =
      CommercialSolutionDecisionEngine.decide({
        portfolio: input.portfolio,
        signals: input.signals,
        evidence: [],
        complementaryRelationships: [],
        generatedAt: input.generatedAt,
      });

    return {
      recommendation,
      semanticStatus,
      acceptedEvidenceCount: 0,
      rejectedSemanticMatches: 0,
      semanticKnowledgeGaps,
    };
  }

  async execute(
    input: CommercialSemanticMatchingInput,
  ): Promise<CommercialSemanticMatchingResult> {
    const available =
      await this.intelligence.isAvailable();

    if (!available) {
      return this.failClosed(
        input,
        'provider_unavailable',
        ['Commercial semantic intelligence is unavailable.'],
      );
    }

    const semantic =
      await this.intelligence.analyze({
        tenantId: input.portfolio.tenantId,
        companyId: input.portfolio.companyId,
        signals: input.signals,
        products: input.products,
        requestId: input.requestId,
      });

    const policy =
      CommercialSemanticEvidencePolicy.evaluate(
        semantic,
      );

    if (semantic.status !== 'valid') {
      return this.failClosed(
        input,
        semantic.status,
        [...policy.knowledgeGaps],
      );
    }

    const recommendation =
      CommercialSolutionDecisionEngine.decide({
        portfolio: input.portfolio,
        signals: input.signals,
        evidence: policy.evidence,
        complementaryRelationships:
          input.complementaryRelationships,
        generatedAt: input.generatedAt,
      });

    return {
      recommendation,
      semanticStatus: semantic.status,
      acceptedEvidenceCount:
        policy.evidence.length,
      rejectedSemanticMatches:
        policy.rejectedMatches.length,
      semanticKnowledgeGaps:
        [...policy.knowledgeGaps],
    };
  }
}
