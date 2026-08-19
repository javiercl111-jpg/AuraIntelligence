import type {
  ProductContext,
} from '../modules/growth-studio/types/growthCommercialContext';

import type {
  SolutionMatchingSignal,
} from '../modules/growth-studio/types/solutionMatching';

import type {
  CommercialSemanticAnalysisRequest,
  CommercialSemanticAnalysisResult,
  CommercialSemanticMatch,
  ICommercialSemanticIntelligence,
} from '../modules/growth-studio/services/contracts/ICommercialSemanticIntelligence';

import {
  AuraLocalConceptAlignmentEngine,
} from './auraLocalConceptAlignmentEngine';

export class AuraLocalCommercialSemanticIntelligence
implements ICommercialSemanticIntelligence {

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private static dimensionFor(
    signal: SolutionMatchingSignal,
    productFields: readonly string[],
  ): CommercialSemanticMatch['dimension'] {

    if (
      signal.kind === 'business_problem' &&
      productFields.includes('problemsSolved')
    ) {
      return 'problem_fit';
    }

    if (
      signal.kind === 'required_capability' &&
      productFields.includes('capabilities')
    ) {
      return 'capability_fit';
    }

    if (
      signal.kind === 'company_size' &&
      productFields.includes('idealCustomerProfiles')
    ) {
      return 'customer_fit';
    }

    if (
      signal.kind === 'industry' &&
      productFields.includes('targetIndustries')
    ) {
      return 'industry_fit';
    }

    if (
      signal.kind === 'operational_need' &&
      productFields.includes('useCases')
    ) {
      return 'use_case_fit';
    }

    if (
      signal.kind === 'declared_interest'
    ) {
      return 'declared_interest';
    }

    return 'other';
  }

  private static analyzeProduct(
    signals: readonly SolutionMatchingSignal[],
    product: ProductContext,
  ): CommercialSemanticMatch[] {
    const result =
      AuraLocalConceptAlignmentEngine.align(
        signals,
        product,
      );

    const matches:
      CommercialSemanticMatch[] = [];

    for (const alignment of result.alignments) {
      for (
        const signalId of
        alignment.prospectSignalIds
      ) {
        const signal =
          signals.find(
            item =>
              item.id === signalId,
          );

        if (!signal) {
          continue;
        }

        const dimension =
          this.dimensionFor(
            signal,
            alignment.productFields,
          );

        matches.push({
          signalId:
            signal.id,

          productContextId:
            product.id,

          dimension,

          semanticStrength:
            alignment.semanticStrength,

          confidence:
            alignment.confidence,

          explanation:
            alignment.explanation,
        });
      }
    }

    return matches;
  }

  async analyze(
    request: CommercialSemanticAnalysisRequest,
  ): Promise<CommercialSemanticAnalysisResult> {

    if (
      request.signals.length === 0 ||
      request.products.length === 0
    ) {
      return {
        status:
          'insufficient_context',

        matches: [],

        knowledgeGaps: [
          'Prospect signals and ProductContext knowledge are required for local semantic analysis.',
        ],

        trace: {
          requestId:
            request.requestId,

          provider:
            'aura_local',

          model:
            'local-concept-alignment-v1',
        },
      };
    }

    const matches =
      request.products.flatMap(
        product =>
          AuraLocalCommercialSemanticIntelligence
            .analyzeProduct(
              request.signals,
              product,
            ),
      );

    return {
      status: 'valid',

      matches,

      knowledgeGaps:
        matches.length === 0
          ? [
              'No supported canonical business concept alignment was found.',
            ]
          : [],

      trace: {
        requestId:
          request.requestId,

        provider:
          'aura_local',

        model:
          'local-concept-alignment-v1',
      },
    };
  }
}
