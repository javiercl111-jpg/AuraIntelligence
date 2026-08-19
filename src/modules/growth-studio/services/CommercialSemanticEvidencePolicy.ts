import type {
  CommercialSemanticAnalysisResult,
  CommercialSemanticMatch,
} from './contracts/ICommercialSemanticIntelligence';

import type {
  SolutionMatchEvidence,
} from '../types/solutionMatching';

import {
  SOLUTION_MATCHING_DIMENSION_WEIGHTS,
} from './SolutionMatchingPolicy';

export const COMMERCIAL_SEMANTIC_EVIDENCE_THRESHOLDS = {
  minimumStrength: 60,
  minimumConfidence: 60,
  strongStrength: 90,
  mediumStrength: 75,
} as const;

export interface CommercialSemanticEvidencePolicyResult {
  readonly evidence: SolutionMatchEvidence[];
  readonly rejectedMatches: readonly {
    readonly signalId: string;
    readonly productContextId: string;
    readonly dimension: string;
    readonly reason: string;
  }[];
  readonly knowledgeGaps: string[];
}

export class CommercialSemanticEvidencePolicy {
  private static clamp(
    value: number,
  ): number {
    return Math.max(
      0,
      Math.min(100, Math.round(value)),
    );
  }

  private static contributionFor(
    match: CommercialSemanticMatch,
  ): number {
    const maximum =
      SOLUTION_MATCHING_DIMENSION_WEIGHTS[
        match.dimension
      ];

    if (maximum <= 0) {
      return 0;
    }

    const strength =
      this.clamp(
        match.semanticStrength,
      );

    if (
      strength <
      COMMERCIAL_SEMANTIC_EVIDENCE_THRESHOLDS
        .minimumStrength
    ) {
      return 0;
    }

    if (
      strength >=
      COMMERCIAL_SEMANTIC_EVIDENCE_THRESHOLDS
        .strongStrength
    ) {
      return maximum;
    }

    if (
      strength >=
      COMMERCIAL_SEMANTIC_EVIDENCE_THRESHOLDS
        .mediumStrength
    ) {
      return Math.round(
        maximum * 0.75,
      );
    }

    return Math.round(
      maximum * 0.5,
    );
  }

  static evaluate(
    result: CommercialSemanticAnalysisResult,
  ): CommercialSemanticEvidencePolicyResult {
    if (result.status !== 'valid') {
      return {
        evidence: [],
        rejectedMatches: [],
        knowledgeGaps: [
          ...result.knowledgeGaps,
        ],
      };
    }

    const evidence:
      SolutionMatchEvidence[] = [];

    const rejectedMatches:
      CommercialSemanticEvidencePolicyResult[
        'rejectedMatches'
      ][number][] = [];

    for (const match of result.matches) {
      const confidence =
        this.clamp(match.confidence);

      if (
        confidence <
        COMMERCIAL_SEMANTIC_EVIDENCE_THRESHOLDS
          .minimumConfidence
      ) {
        rejectedMatches.push({
          signalId:
            match.signalId,

          productContextId:
            match.productContextId,

          dimension:
            match.dimension,

          reason:
            'Semantic confidence is below the minimum evidence threshold.',
        });

        continue;
      }

      const contribution =
        this.contributionFor(match);

      if (contribution <= 0) {
        rejectedMatches.push({
          signalId:
            match.signalId,

          productContextId:
            match.productContextId,

          dimension:
            match.dimension,

          reason:
            'Semantic strength is below the minimum evidence threshold.',
        });

        continue;
      }

      evidence.push({
        id:
          `semantic:${result.trace.requestId}:` +
          `${match.productContextId}:` +
          `${match.signalId}:` +
          `${match.dimension}`,

        signalId:
          match.signalId,

        productContextId:
          match.productContextId,

        dimension:
          match.dimension,

        contribution,

        explanation:
          match.explanation,
      });
    }

    return {
      evidence,
      rejectedMatches,
      knowledgeGaps: [
        ...result.knowledgeGaps,
      ],
    };
  }
}
