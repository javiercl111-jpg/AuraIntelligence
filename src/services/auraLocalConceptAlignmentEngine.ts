import type {
  ProductContext,
} from '../modules/growth-studio/types/growthCommercialContext';

import type {
  SolutionMatchingSignal,
} from '../modules/growth-studio/types/solutionMatching';

import type {
  AuraCanonicalBusinessConcept,
} from './auraLocalSemanticVocabulary';

import {
  AuraLocalBusinessConceptMapper,
} from './auraLocalBusinessConceptMapper';

export interface AuraLocalConceptAlignment {
  readonly concept:
    AuraCanonicalBusinessConcept;

  readonly semanticStrength: number;
  readonly confidence: number;

  readonly prospectSignalIds:
    readonly string[];

  readonly productFields:
    readonly string[];

  readonly explanation: string;
}

export interface AuraLocalConceptAlignmentResult {
  readonly alignments:
    readonly AuraLocalConceptAlignment[];

  readonly unmatchedProspectConcepts:
    readonly AuraCanonicalBusinessConcept[];

  readonly unmatchedProductConcepts:
    readonly AuraCanonicalBusinessConcept[];
}

export class AuraLocalConceptAlignmentEngine {
  private static clamp(
    value: number,
  ): number {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(value),
      ),
    );
  }

  static align(
    signals:
      readonly SolutionMatchingSignal[],
    product:
      ProductContext,
  ): AuraLocalConceptAlignmentResult {
    const prospect =
      AuraLocalBusinessConceptMapper
        .mapSignals(signals);

    const productMap =
      AuraLocalBusinessConceptMapper
        .mapProduct(product);

    const productConcepts =
      new Set(
        productMap.concepts,
      );

    const prospectConcepts =
      new Set(
        prospect.concepts,
      );

    const alignments:
      AuraLocalConceptAlignment[] = [];

    for (
      const concept of
      prospect.concepts
    ) {
      if (
        !productConcepts.has(
          concept,
        )
      ) {
        continue;
      }

      const prospectEvidence =
        prospect.evidence.filter(
          item =>
            item.concept ===
            concept,
        );

      const productEvidence =
        productMap.evidence.filter(
          item =>
            item.concept ===
            concept,
        );

      const relevantSignals =
        signals.filter(
          signal =>
            prospectEvidence.some(
              item =>
                item.sourceId ===
                signal.id,
            ),
        );

      const signalConfidence =
        relevantSignals.length > 0
          ? Math.round(
              relevantSignals.reduce(
                (sum, signal) =>
                  sum +
                  this.clamp(
                    signal.confidence,
                  ),
                0,
              ) /
              relevantSignals.length,
            )
          : 0;


      /**
       * Exact canonical alignment is semantically strong.
       * Repeated aliases MUST NOT increase semanticStrength.
       */
      const semanticStrength =
        100;

      /**
       * Product-side confidence is intentionally conservative.
       *
       * ProductContext field-level confidence will be introduced
       * later. For this foundation, product evidence existence
       * establishes support but does not inflate confidence.
       */
      const confidence =
        this.clamp(
          signalConfidence,
        );

      alignments.push({
        concept,
        semanticStrength,
        confidence,

        prospectSignalIds: [
          ...new Set(
            prospectEvidence.map(
              item =>
                item.sourceId,
            ),
          ),
        ],

        productFields: [
          ...new Set(
            productEvidence.map(
              item =>
                item.field,
            ),
          ),
        ],

        explanation:
          `Canonical business concept ${concept} is supported by both prospect and product context.`,
      });
    }

    const unmatchedProspectConcepts =
      prospect.concepts.filter(
        concept =>
          !productConcepts.has(
            concept,
          ),
      );

    const unmatchedProductConcepts =
      productMap.concepts.filter(
        concept =>
          !prospectConcepts.has(
            concept,
          ),
      );

    return {
      alignments,
      unmatchedProspectConcepts,
      unmatchedProductConcepts,
    };
  }
}
