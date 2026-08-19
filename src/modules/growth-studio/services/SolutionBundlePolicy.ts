import type {
  ProductSolutionCandidate,
  SolutionBundle,
  SolutionBundleItem,
  SolutionMatchEvidence,
} from '../types/solutionMatching';

export interface SolutionBundlePolicyInput {
  readonly candidates: ProductSolutionCandidate[];
  readonly evidence: SolutionMatchEvidence[];

  /**
   * Explicit relationships indicating that two products
   * solve distinct but complementary supported needs.
   *
   * This must come from normalized commercial reasoning.
   * It must NOT be inferred merely from candidate scores.
   */
  readonly complementaryRelationships: readonly {
    readonly primaryProductContextId: string;
    readonly supportingProductContextId: string;
    readonly reason: string;
    readonly evidenceIds: string[];
  }[];

  readonly bundleId: string;
}

export interface SolutionBundlePolicyResult {
  readonly allowed: boolean;
  readonly bundle?: SolutionBundle;
  readonly blockingReasons: string[];
}

export class SolutionBundlePolicy {
  private static candidateById(
    candidates: ProductSolutionCandidate[],
    id: string,
  ): ProductSolutionCandidate | undefined {
    return candidates.find(
      candidate =>
        candidate.productContext.productContextId === id,
    );
  }

  private static hasEvidence(
    evidence: SolutionMatchEvidence[],
    evidenceIds: string[],
  ): boolean {
    if (evidenceIds.length === 0) {
      return false;
    }

    const available = new Set(
      evidence.map(item => item.id),
    );

    return evidenceIds.every(
      id => available.has(id),
    );
  }

  static evaluate(
    input: SolutionBundlePolicyInput,
  ): SolutionBundlePolicyResult {
    const blockingReasons: string[] = [];

    const recommendedCandidates =
      input.candidates.filter(
        candidate =>
          candidate.recommendationStatus ===
          'recommended',
      );

    if (recommendedCandidates.length === 0) {
      return {
        allowed: false,
        blockingReasons: [
          'No recommended primary product exists.',
        ],
      };
    }

    const primary =
      [...recommendedCandidates]
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.confidence - a.confidence ||
            a.productContext.productContextId.localeCompare(
              b.productContext.productContextId,
            ),
        )[0];

    const relationships =
      input.complementaryRelationships.filter(
        relationship =>
          relationship.primaryProductContextId ===
          primary.productContext.productContextId,
      );

    const supportingItems: SolutionBundleItem[] = [];
    const bundleEvidenceIds = new Set<string>(
      primary.evidenceIds,
    );

    for (const relationship of relationships) {
      if (supportingItems.length >= 2) {
        break;
      }

      const supporting =
        this.candidateById(
          input.candidates,
          relationship.supportingProductContextId,
        );

      if (!supporting) {
        continue;
      }

      if (
        ![
          'recommended',
          'possible',
        ].includes(
          supporting.recommendationStatus,
        )
      ) {
        continue;
      }

      if (supporting.score < 45) {
        continue;
      }

      if (supporting.confidence < 60) {
        continue;
      }

      if (supporting.evidenceIds.length === 0) {
        continue;
      }

      if (
        !this.hasEvidence(
          input.evidence,
          supporting.evidenceIds,
        )
      ) {
        continue;
      }

      if (
        !this.hasEvidence(
          input.evidence,
          [...relationship.evidenceIds],
        )
      ) {
        continue;
      }

      supportingItems.push({
        productContext:
          supporting.productContext,

        role: 'supporting',

        reason:
          relationship.reason,
      });

      for (
        const id of
        supporting.evidenceIds
      ) {
        bundleEvidenceIds.add(id);
      }

      for (
        const id of
        relationship.evidenceIds
      ) {
        bundleEvidenceIds.add(id);
      }
    }

    if (supportingItems.length === 0) {
      blockingReasons.push(
        'No evidence-backed complementary supporting product was found.',
      );

      return {
        allowed: false,
        blockingReasons,
      };
    }

    const primaryItem: SolutionBundleItem = {
      productContext:
        primary.productContext,

      role: 'primary',

      reason:
        'Highest supported commercial fit.',
    };

    const supportingCandidates =
      supportingItems.map(
        item =>
          this.candidateById(
            input.candidates,
            item.productContext.productContextId,
          )!,
      );

    /**
     * Bundle score is conservative.
     *
     * It starts from the primary score and may only
     * receive a limited incremental-value bonus.
     *
     * More products therefore cannot inflate the
     * bundle toward 100 automatically.
     */
    const incrementalBonus =
      Math.min(
        10,
        supportingCandidates.length * 5,
      );

    const score =
      Math.min(
        100,
        primary.score +
          incrementalBonus,
      );

    const confidence =
      Math.round(
        (
          primary.confidence +
          supportingCandidates.reduce(
            (sum, candidate) =>
              sum + candidate.confidence,
            0,
          )
        ) /
          (
            supportingCandidates.length +
            1
          ),
      );

    return {
      allowed: true,

      bundle: {
        id: input.bundleId,

        items: [
          primaryItem,
          ...supportingItems,
        ],

        score,
        confidence,

        rationale:
          'Evidence-backed products address distinct complementary commercial needs.',

        evidenceIds:
          [...bundleEvidenceIds],
      },

      blockingReasons: [],
    };
  }
}
