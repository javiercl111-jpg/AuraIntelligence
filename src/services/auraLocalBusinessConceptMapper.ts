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
  AuraLocalSemanticVocabulary,
} from './auraLocalSemanticVocabulary';

export interface AuraLocalConceptEvidence {
  readonly concept: AuraCanonicalBusinessConcept;

  readonly sourceType:
    | 'prospect_signal'
    | 'product_context';

  readonly sourceId: string;

  readonly field:
    | 'signal'
    | 'description'
    | 'problemsSolved'
    | 'capabilities'
    | 'idealCustomerProfiles'
    | 'targetIndustries'
    | 'useCases';

  readonly matchedAliases: readonly string[];
}

export interface AuraLocalConceptMap {
  readonly concepts:
    readonly AuraCanonicalBusinessConcept[];

  readonly evidence:
    readonly AuraLocalConceptEvidence[];
}

export class AuraLocalBusinessConceptMapper {
  private static addText(
    output: AuraLocalConceptEvidence[],
    sourceType: AuraLocalConceptEvidence['sourceType'],
    sourceId: string,
    field: AuraLocalConceptEvidence['field'],
    value: string,
  ): void {
    for (
      const match of
      AuraLocalSemanticVocabulary.detect(value)
    ) {
      output.push({
        concept: match.concept,
        sourceType,
        sourceId,
        field,
        matchedAliases: [...match.matchedAliases],
      });
    }
  }

  private static buildMap(
    evidence: AuraLocalConceptEvidence[],
  ): AuraLocalConceptMap {
    return {
      concepts: [
        ...new Set(
          evidence.map(item => item.concept),
        ),
      ],
      evidence,
    };
  }

  static mapSignals(
    signals: readonly SolutionMatchingSignal[],
  ): AuraLocalConceptMap {
    const evidence: AuraLocalConceptEvidence[] = [];

    for (const signal of signals) {
      this.addText(
        evidence,
        'prospect_signal',
        signal.id,
        'signal',
        signal.value,
      );
    }

    return this.buildMap(evidence);
  }

  static mapProduct(
    product: ProductContext,
  ): AuraLocalConceptMap {
    const evidence: AuraLocalConceptEvidence[] = [];

    const addField = (
      field: AuraLocalConceptEvidence['field'],
      values: readonly string[],
    ) => {
      for (const value of values) {
        this.addText(
          evidence,
          'product_context',
          product.id,
          field,
          value,
        );
      }
    };

    if (product.description.value) {
      addField(
        'description',
        [product.description.value],
      );
    }

    addField(
      'problemsSolved',
      product.problemsSolved.value || [],
    );

    addField(
      'capabilities',
      product.capabilities.value || [],
    );

    addField(
      'idealCustomerProfiles',
      product.idealCustomerProfiles.value || [],
    );

    addField(
      'targetIndustries',
      product.targetIndustries.value || [],
    );

    addField(
      'useCases',
      product.useCases.value || [],
    );

    return this.buildMap(evidence);
  }
}
