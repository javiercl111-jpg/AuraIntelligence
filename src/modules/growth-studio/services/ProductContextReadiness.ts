import type {
  CommercialKnowledgeField,
  ProductContext,
} from '../types/growthCommercialContext';

import {
  PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS,
  PRODUCT_KNOWLEDGE_STRATEGY_REQUIRED_FIELDS,
} from '../types/productKnowledgeIntake';

export type ProductContextReadinessLevel =
  | 'insufficient'
  | 'known'
  | 'strategy_ready'
  | 'outreach_ready';

export interface ProductContextReadinessResult {
  readonly level: ProductContextReadinessLevel;
  readonly strategyReady: boolean;
  readonly outreachReady: boolean;
  readonly missingStrategyFields: string[];
  readonly unsupportedEvidenceIds: string[];
  readonly unsafeClaimFields: string[];
}

export class ProductContextReadiness {
  private static hasKnowledge(
    field: CommercialKnowledgeField<unknown>,
  ): boolean {
    if (field.status === 'missing' || field.value === null) {
      return false;
    }

    if (Array.isArray(field.value)) {
      return field.value.length > 0;
    }

    if (typeof field.value === 'string') {
      return field.value.trim().length > 0;
    }

    return true;
  }

  private static evidenceIntegrity(
    context: ProductContext,
  ): string[] {
    const availableEvidenceIds = new Set(
      context.evidence.map(evidence => evidence.id),
    );

    const unsupported = new Set<string>();

    const fields: CommercialKnowledgeField<unknown>[] = [
      context.name,
      context.category,
      context.description,
      context.problemsSolved,
      context.capabilities,
      context.benefits,
      context.differentiators,
      context.idealCustomerProfiles,
      context.targetIndustries,
      context.useCases,
      context.pricingContext,
      context.commercialEvidence,
      context.claimsRestrictions,
      context.preferredMessages,
      context.websiteUrl,
    ];

    for (const field of fields) {
      for (const evidenceId of field.evidenceIds) {
        if (!availableEvidenceIds.has(evidenceId)) {
          unsupported.add(evidenceId);
        }
      }
    }

    return [...unsupported].sort();
  }

  static evaluate(
    context: ProductContext,
  ): ProductContextReadinessResult {
    const missingStrategyFields =
      PRODUCT_KNOWLEDGE_STRATEGY_REQUIRED_FIELDS.filter(
        fieldName =>
          !this.hasKnowledge(
            context[fieldName] as CommercialKnowledgeField<unknown>,
          ),
      );

    const unsupportedEvidenceIds =
      this.evidenceIntegrity(context);

    const unsafeClaimFields =
      PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS.filter(
        fieldName => {
          const field =
            context[fieldName] as CommercialKnowledgeField<unknown>;

          if (!this.hasKnowledge(field)) {
            return false;
          }

          if (field.status !== 'confirmed') {
            return true;
          }

          if (field.evidenceIds.length === 0) {
            return true;
          }

          return field.evidenceIds.some(
            evidenceId =>
              !context.evidence.some(
                evidence => evidence.id === evidenceId,
              ),
          );
        },
      );

    const hasName = this.hasKnowledge(context.name);

    const strategyReady =
      missingStrategyFields.length === 0 &&
      unsupportedEvidenceIds.length === 0;

    const outreachReady =
      strategyReady &&
      unsafeClaimFields.length === 0;

    let level: ProductContextReadinessLevel =
      'insufficient';

    if (hasName) {
      level = 'known';
    }

    if (strategyReady) {
      level = 'strategy_ready';
    }

    if (outreachReady) {
      level = 'outreach_ready';
    }

    return {
      level,
      strategyReady,
      outreachReady,
      missingStrategyFields: [...missingStrategyFields],
      unsupportedEvidenceIds,
      unsafeClaimFields: [...unsafeClaimFields],
    };
  }
}
