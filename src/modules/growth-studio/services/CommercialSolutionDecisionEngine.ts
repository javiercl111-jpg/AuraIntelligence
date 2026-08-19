import type {
  CommercialSolutionRecommendation,
  ProductPortfolio,
  SolutionMatchEvidence,
  SolutionMatchingSignal,
} from '../types/solutionMatching';

import {
  SolutionMatchingEngine,
} from './SolutionMatchingEngine';

import {
  SolutionBundlePolicy,
} from './SolutionBundlePolicy';

export interface ComplementaryProductRelationship {
  readonly primaryProductContextId: string;
  readonly supportingProductContextId: string;
  readonly reason: string;
  readonly evidenceIds: string[];
}

export interface CommercialSolutionDecisionInput {
  readonly portfolio: ProductPortfolio;

  readonly signals: SolutionMatchingSignal[];
  readonly evidence: SolutionMatchEvidence[];

  readonly complementaryRelationships:
    ComplementaryProductRelationship[];

  readonly generatedAt: string;
}

export class CommercialSolutionDecisionEngine {
  static decide(
    input: CommercialSolutionDecisionInput,
  ): CommercialSolutionRecommendation {
    const base =
      SolutionMatchingEngine.match({
        portfolio: input.portfolio,
        signals: input.signals,
        evidence: input.evidence,
        generatedAt: input.generatedAt,
      });

    /**
     * Fail-closed outcomes from matching remain authoritative.
     * Bundle evaluation is only relevant after a primary
     * product already qualifies for recommendation.
     */
    if (
      base.decision !==
      'single_product'
    ) {
      return base;
    }

    const bundle =
      SolutionBundlePolicy.evaluate({
        candidates:
          base.candidates,

        evidence:
          input.evidence,

        complementaryRelationships:
          input.complementaryRelationships,

        bundleId:
          `solution-bundle:` +
          `${base.tenantId}:` +
          `${base.companyId}:` +
          `${input.generatedAt}`,
      });

    if (
      !bundle.allowed ||
      !bundle.bundle
    ) {
      return base;
    }

    return {
      ...base,

      decision:
        'solution_bundle',

      bundle:
        bundle.bundle,

      confidence:
        bundle.bundle.confidence,
    };
  }
}
