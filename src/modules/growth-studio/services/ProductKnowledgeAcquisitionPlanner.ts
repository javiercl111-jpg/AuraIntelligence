import type {
  ProductContext,
} from '../types/growthCommercialContext';

import {
  ProductContextReadiness,
  type ProductContextReadinessLevel,
} from './ProductContextReadiness';

export type ProductKnowledgeAcquisitionField =
  | 'name'
  | 'description'
  | 'problemsSolved'
  | 'benefits'
  | 'idealCustomerProfiles'
  | 'capabilities'
  | 'targetIndustries'
  | 'useCases'
  | 'differentiators'
  | 'claimsRestrictions'
  | 'commercialEvidence'
  | 'preferredMessages'
  | 'websiteUrl'
  | 'pricingContext';

export interface ProductKnowledgeAcquisitionStep {
  readonly field: ProductKnowledgeAcquisitionField;
  readonly priority:
    | 'critical'
    | 'high'
    | 'medium'
    | 'low';
  readonly reason: string;
  readonly blocksStrategy: boolean;
  readonly blocksOutreach: boolean;
}

export interface ProductKnowledgeAcquisitionPlan {
  readonly readinessLevel: ProductContextReadinessLevel;
  readonly nextStep: ProductKnowledgeAcquisitionStep | null;
  readonly remainingStrategyGaps: string[];
  readonly unsafeClaimFields: string[];
  readonly unsupportedEvidenceIds: string[];
}

const STRATEGY_PRIORITY: readonly ProductKnowledgeAcquisitionField[] = [
  'name',
  'description',
  'problemsSolved',
  'benefits',
  'idealCustomerProfiles',
];

export class ProductKnowledgeAcquisitionPlanner {
  static plan(
    context: ProductContext,
  ): ProductKnowledgeAcquisitionPlan {
    const readiness =
      ProductContextReadiness.evaluate(context);

    let nextStep: ProductKnowledgeAcquisitionStep | null = null;

    for (const field of STRATEGY_PRIORITY) {
      if (
        readiness.missingStrategyFields.includes(field)
      ) {
        nextStep = {
          field,
          priority:
            field === 'name'
              ? 'critical'
              : 'high',
          reason:
            `Missing product knowledge required for strategy: ${field}`,
          blocksStrategy: true,
          blocksOutreach: true,
        };

        break;
      }
    }

    if (
      !nextStep &&
      readiness.unsupportedEvidenceIds.length > 0
    ) {
      nextStep = {
        field: 'commercialEvidence',
        priority: 'high',
        reason:
          'Product knowledge references evidence that is not available.',
        blocksStrategy: true,
        blocksOutreach: true,
      };
    }

    if (
      !nextStep &&
      readiness.unsafeClaimFields.length > 0
    ) {
      const unsafe =
        readiness.unsafeClaimFields[0];

      nextStep = {
        field:
          unsafe as ProductKnowledgeAcquisitionField,
        priority: 'high',
        reason:
          `Commercially sensitive knowledge requires confirmation and evidence: ${unsafe}`,
        blocksStrategy: false,
        blocksOutreach: true,
      };
    }

    return {
      readinessLevel: readiness.level,
      nextStep,
      remainingStrategyGaps: [
        ...readiness.missingStrategyFields,
      ],
      unsafeClaimFields: [
        ...readiness.unsafeClaimFields,
      ],
      unsupportedEvidenceIds: [
        ...readiness.unsupportedEvidenceIds,
      ],
    };
  }
}
