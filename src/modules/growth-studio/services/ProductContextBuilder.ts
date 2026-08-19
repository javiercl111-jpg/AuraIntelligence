import type {
  CommercialEvidence,
  CommercialKnowledgeField,
  ProductContext,
} from '../types/growthCommercialContext';

import type {
  ProductKnowledgeEvidence,
  ProductKnowledgeIntake,
  ProductKnowledgeValue,
} from '../types/productKnowledgeIntake';

export class ProductContextBuilder {
  private static normalizeField<T>(
    field: ProductKnowledgeValue<T>,
  ): CommercialKnowledgeField<T> {
    if (
      field.status === 'missing' ||
      field.value === null
    ) {
      return {
        value: null,
        status: 'missing',
        confidence: 0,
        evidenceIds: [],
      };
    }

    const confidence = Math.max(
      0,
      Math.min(100, field.confidence),
    );

    return {
      value: field.value,
      status: field.status,
      confidence,
      evidenceIds: [...field.evidenceIds],
    };
  }

  private static mapEvidence(
    source: ProductKnowledgeEvidence,
  ): CommercialEvidence {
    return {
      id: source.id,
      sourceType: source.sourceType === 'product_website'
        ? 'other'
        : source.sourceType,
      sourceRef: source.sourceRef,
      label: source.label,
      capturedAt: source.capturedAt,
    };
  }

  static build(
    intake: ProductKnowledgeIntake,
    existing?: ProductContext,
  ): ProductContext {
    const now = intake.updatedAt;

    const name = this.normalizeField(intake.name);
    const category = this.normalizeField(intake.category);
    const description = this.normalizeField(intake.description);

    const problemsSolved =
      this.normalizeField(intake.problemsSolved);

    const capabilities =
      this.normalizeField(intake.capabilities);

    const benefits =
      this.normalizeField(intake.benefits);

    const differentiators =
      this.normalizeField(intake.differentiators);

    const idealCustomerProfiles =
      this.normalizeField(intake.idealCustomerProfiles);

    const targetIndustries =
      this.normalizeField(intake.targetIndustries);

    const useCases =
      this.normalizeField(intake.useCases);

    const pricingContext =
      this.normalizeField(intake.pricingContext);

    const commercialEvidence =
      this.normalizeField(intake.commercialEvidence);

    const claimsRestrictions =
      this.normalizeField(intake.claimsRestrictions);

    const preferredMessages =
      this.normalizeField(intake.preferredMessages);

    const websiteUrl =
      this.normalizeField(intake.websiteUrl);

    const fields = [
      name,
      category,
      description,
      problemsSolved,
      capabilities,
      benefits,
      differentiators,
      idealCustomerProfiles,
      targetIndustries,
      useCases,
      pricingContext,
      commercialEvidence,
      claimsRestrictions,
      preferredMessages,
      websiteUrl,
    ];

    const completenessScore = Math.round(
      (
        fields.filter(
          field => field.status !== 'missing',
        ).length /
        fields.length
      ) * 100,
    );

    const safeName =
      typeof name.value === 'string' && name.value.trim()
        ? name.value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : 'unknown-product';

    return {
      id:
        existing?.id ||
        `product:${intake.tenantId}:${intake.companyId}:${safeName}`,

      tenantId: intake.tenantId,
      companyId: intake.companyId,

      name,
      category,
      description,

      problemsSolved,
      capabilities,
      benefits,
      differentiators,

      idealCustomerProfiles,
      targetIndustries,
      useCases,

      pricingContext,
      commercialEvidence,
      claimsRestrictions,
      preferredMessages,
      websiteUrl,

      evidence: intake.evidence.map(
        evidence => this.mapEvidence(evidence),
      ),

      status: existing?.status || 'draft',
      completenessScore,

      version: existing
        ? existing.version + 1
        : 1,

      createdAt:
        existing?.createdAt ||
        intake.capturedAt,

      updatedAt: now,
    };
  }
}
