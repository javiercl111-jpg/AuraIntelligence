import type {
  ProductSolutionCandidate,
  SolutionMatchEvidence,
} from '../types/solutionMatching';

export const SOLUTION_MATCHING_DIMENSION_WEIGHTS = {
  problem_fit: 30,
  capability_fit: 25,
  customer_fit: 15,
  use_case_fit: 10,
  industry_fit: 10,
  declared_interest: 10,
  other: 0,
} as const;

export const SOLUTION_MATCHING_THRESHOLDS = {
  recommendedScore: 70,
  recommendedConfidence: 60,
  possibleScore: 45,
} as const;

export type StrongMatchingDimension =
  | 'problem_fit'
  | 'capability_fit'
  | 'declared_interest';

export interface SolutionMatchingPolicyResult {
  readonly score: number;
  readonly confidence: number;

  readonly recommendationStatus:
    ProductSolutionCandidate['recommendationStatus'];

  readonly strongEvidencePresent: boolean;

  readonly matchedDimensions: string[];
  readonly evidenceIds: string[];

  readonly knowledgeGaps: string[];
}

export class SolutionMatchingPolicy {
  private static clamp(
    value: number,
  ): number {
    return Math.max(
      0,
      Math.min(100, Math.round(value)),
    );
  }

  static evaluate(
    evidence: SolutionMatchEvidence[],
    signalConfidences: Readonly<Record<string, number>>,
  ): SolutionMatchingPolicyResult {

    const dimensionScores =
      new Map<string, number>();

    const evidenceIds: string[] = [];

    let weightedConfidenceNumerator = 0;
    let weightedConfidenceDenominator = 0;

    for (const item of evidence) {
      const maxWeight =
        SOLUTION_MATCHING_DIMENSION_WEIGHTS[
          item.dimension
        ];

      if (maxWeight <= 0) {
        continue;
      }

      const contribution =
        Math.max(
          0,
          Math.min(
            maxWeight,
            item.contribution,
          ),
        );

      const current =
        dimensionScores.get(
          item.dimension,
        ) || 0;

      dimensionScores.set(
        item.dimension,
        Math.min(
          maxWeight,
          current + contribution,
        ),
      );

      evidenceIds.push(item.id);

      const signalConfidence =
        this.clamp(
          signalConfidences[
            item.signalId
          ] ?? 0,
        );

      weightedConfidenceNumerator +=
        signalConfidence * contribution;

      weightedConfidenceDenominator +=
        contribution;
    }

    const score =
      this.clamp(
        [...dimensionScores.values()]
          .reduce(
            (sum, value) => sum + value,
            0,
          ),
      );

    const confidence =
      weightedConfidenceDenominator > 0
        ? this.clamp(
            weightedConfidenceNumerator /
            weightedConfidenceDenominator,
          )
        : 0;

    const matchedDimensions =
      [...dimensionScores.entries()]
        .filter(([, value]) => value > 0)
        .map(([dimension]) => dimension)
        .sort();

    const strongDimensions:
      StrongMatchingDimension[] = [
        'problem_fit',
        'capability_fit',
        'declared_interest',
      ];

    const strongEvidencePresent =
      strongDimensions.some(
        dimension =>
          (dimensionScores.get(dimension) || 0) > 0,
      );

    const knowledgeGaps: string[] = [];

    if (!strongEvidencePresent) {
      knowledgeGaps.push(
        'No strong problem, capability or declared-interest evidence supports this product.',
      );
    }

    if (
      confidence <
      SOLUTION_MATCHING_THRESHOLDS
        .recommendedConfidence
    ) {
      knowledgeGaps.push(
        'Recommendation confidence is below the supported recommendation threshold.',
      );
    }

    let recommendationStatus:
      ProductSolutionCandidate['recommendationStatus'] =
        'insufficient_evidence';

    if (
      score >=
        SOLUTION_MATCHING_THRESHOLDS
          .recommendedScore &&
      confidence >=
        SOLUTION_MATCHING_THRESHOLDS
          .recommendedConfidence &&
      strongEvidencePresent
    ) {
      recommendationStatus =
        'recommended';
    }
    else if (
      score >=
        SOLUTION_MATCHING_THRESHOLDS
          .possibleScore &&
      strongEvidencePresent
    ) {
      recommendationStatus =
        'possible';
    }
    else if (
      score === 0
    ) {
      recommendationStatus =
        'not_recommended';
    }

    return {
      score,
      confidence,
      recommendationStatus,
      strongEvidencePresent,
      matchedDimensions,
      evidenceIds: [
        ...new Set(evidenceIds),
      ],
      knowledgeGaps,
    };
  }
}
