import type {
  CommercialSolutionRecommendation,
  ProductPortfolio,
  ProductSolutionCandidate,
  SolutionMatchEvidence,
  SolutionMatchingSignal,
} from '../types/solutionMatching';

import type {
  ProductContextRef,
} from '../types/growthCommercialContext';

import {
  SolutionMatchingPolicy,
} from './SolutionMatchingPolicy';

export interface SolutionMatchingEngineInput {
  readonly portfolio: ProductPortfolio;

  readonly signals: SolutionMatchingSignal[];

  /**
   * Evidence must already be normalized against
   * a specific ProductContext.
   *
   * This engine does not perform semantic inference.
   */
  readonly evidence: SolutionMatchEvidence[];

  readonly generatedAt: string;
}

export class SolutionMatchingEngine {
  private static candidateFor(
    productContext: ProductContextRef,
    signals: SolutionMatchingSignal[],
    evidence: SolutionMatchEvidence[],
  ): ProductSolutionCandidate {
    const productEvidence =
      evidence.filter(
        item =>
          item.productContextId ===
          productContext.productContextId,
      );

    const signalConfidences =
      Object.fromEntries(
        signals.map(
          signal => [
            signal.id,
            signal.confidence,
          ],
        ),
      );

    const result =
      SolutionMatchingPolicy.evaluate(
        productEvidence,
        signalConfidences,
      );

    return {
      productContext,

      score: result.score,
      confidence: result.confidence,

      evidenceIds: result.evidenceIds,

      matchedDimensions:
        result.matchedDimensions,

      knowledgeGaps:
        result.knowledgeGaps,

      recommendationStatus:
        result.recommendationStatus,
    };
  }

  static match(
    input: SolutionMatchingEngineInput,
  ): CommercialSolutionRecommendation {
    const eligibleEntries =
      input.portfolio.entries.filter(
        entry =>
          entry.status === 'active' &&
          entry.commerciallyRecommendable,
      );

    const candidates =
      eligibleEntries
        .map(
          entry =>
            this.candidateFor(
              entry.productContext,
              input.signals,
              input.evidence,
            ),
        )
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.confidence - a.confidence ||
            a.productContext.productContextId
              .localeCompare(
                b.productContext.productContextId,
              ),
        );

    const recommended =
      candidates.filter(
        candidate =>
          candidate.recommendationStatus ===
          'recommended',
      );

    const possible =
      candidates.filter(
        candidate =>
          candidate.recommendationStatus ===
          'possible',
      );

    let decision:
      CommercialSolutionRecommendation['decision'] =
        'more_discovery_required';

    let primaryProduct:
      ProductContextRef | undefined;

    const knowledgeGaps =
      new Set<string>();

    if (recommended.length > 0) {
      decision = 'single_product';
      primaryProduct =
        recommended[0].productContext;
    }
    else if (
      possible.length === 0 &&
      candidates.every(
        candidate =>
          candidate.recommendationStatus ===
          'not_recommended',
      )
    ) {
      decision = 'no_recommendation';
    }
    else {
      decision =
        'more_discovery_required';

      for (const candidate of candidates) {
        for (
          const gap of
          candidate.knowledgeGaps
        ) {
          knowledgeGaps.add(gap);
        }
      }

      if (
        knowledgeGaps.size === 0
      ) {
        knowledgeGaps.add(
          'No product has enough supported evidence to reach recommendation threshold.',
        );
      }
    }

    const usedEvidenceIds =
      new Set(
        candidates.flatMap(
          candidate =>
            candidate.evidenceIds,
        ),
      );

    const recommendationEvidence =
      input.evidence.filter(
        evidence =>
          usedEvidenceIds.has(
            evidence.id,
          ),
      );

    const confidence =
      recommended.length > 0
        ? recommended[0].confidence
        : candidates.length > 0
          ? candidates[0].confidence
          : 0;

    return {
      id:
        `solution-recommendation:` +
        `${input.portfolio.tenantId}:` +
        `${input.portfolio.companyId}:` +
        `${input.generatedAt}`,

      tenantId:
        input.portfolio.tenantId,

      companyId:
        input.portfolio.companyId,

      decision,

      candidates,

      primaryProduct,

      evidence:
        recommendationEvidence,

      knowledgeGaps:
        [...knowledgeGaps],

      confidence,

      generatedAt:
        input.generatedAt,
    };
  }
}
