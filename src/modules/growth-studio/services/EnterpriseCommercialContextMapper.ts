import type {
  BrandBrain,
  BrandBrainConfidence,
  BrandBrainField,
} from '../types/brandBrain';

import type {
  CommercialEvidence,
  CommercialKnowledgeField,
  CommercialKnowledgeStatus,
  EnterpriseCommercialContext,
} from '../types/growthCommercialContext';

export class EnterpriseCommercialContextMapper {
  private static confidenceToNumber(
    confidence: BrandBrainConfidence | undefined,
    status: CommercialKnowledgeStatus,
  ): number {
    if (status === 'missing') return 0;

    switch (confidence) {
      case 'high':
        return 90;
      case 'medium':
        return 65;
      case 'low':
        return 35;
      default:
        return 0;
    }
  }

  private static mapField<T>(
    fieldName: string,
    field: BrandBrainField<T> | undefined,
    evidence: CommercialEvidence[],
  ): CommercialKnowledgeField<T> {
    if (!field || field.status === 'missing' || field.value === null) {
      return {
        value: null,
        status: 'missing',
        confidence: 0,
        evidenceIds: [],
      };
    }

    const hasEvidence = Boolean(field.source || field.evidence);

    const status: CommercialKnowledgeStatus =
      field.status === 'confirmed' && hasEvidence
        ? 'confirmed'
        : 'inferred';

    const evidenceIds: string[] = [];

    if (hasEvidence) {
      const evidenceId = `brand-brain:${fieldName}`;

      evidence.push({
        id: evidenceId,
        sourceType: 'other',
        sourceRef: field.source,
        label: field.evidence || field.source || `Brand Brain: ${fieldName}`,
        capturedAt: new Date(0).toISOString(),
      });

      evidenceIds.push(evidenceId);
    }

    return {
      value: field.value,
      status,
      confidence: this.confidenceToNumber(field.confidence, status),
      evidenceIds,
    };
  }

  static fromBrandBrain(brain: BrandBrain): EnterpriseCommercialContext {
    const evidence: CommercialEvidence[] = [];

    const companyName = this.mapField(
      'companyName',
      brain.companyProfile?.companyName,
      evidence,
    );

    const businessDescription = this.mapField(
      'businessDescription',
      brain.companyProfile?.businessDescription,
      evidence,
    );

    const industry = this.mapField(
      'industry',
      brain.industry,
      evidence,
    );

    const valueProposition = this.mapField(
      'valueProposition',
      brain.valueProposition,
      evidence,
    );

    const differentiators = this.mapField(
      'differentiators',
      brain.differentiators,
      evidence,
    );

    const brandTone = this.mapField(
      'brandTone',
      brain.brandTone,
      evidence,
    );

    const communicationStyle = this.mapField(
      'communicationStyle',
      brain.communicationStyle,
      evidence,
    );

    const businessGoals = this.mapField(
      'businessGoals',
      brain.businessGoals,
      evidence,
    );

    const targetMarkets: CommercialKnowledgeField<string[]> = {
      value: null,
      status: 'missing',
      confidence: 0,
      evidenceIds: [],
    };

    const fields = [
      companyName,
      businessDescription,
      industry,
      valueProposition,
      differentiators,
      targetMarkets,
      brandTone,
      communicationStyle,
      businessGoals,
    ];

    const completenessScore = Math.round(
      (fields.filter(field => field.status !== 'missing').length / fields.length) * 100,
    );

    return {
      id: `enterprise:${brain.tenantId}:${brain.companyId}`,
      tenantId: brain.tenantId,
      companyId: brain.companyId,

      companyName,
      businessDescription,
      industry,
      valueProposition,
      differentiators,
      targetMarkets,
      brandTone,
      communicationStyle,
      businessGoals,

      evidence,

      status: 'draft',
      completenessScore,
      version: 1,

      createdAt: brain.createdAt,
      updatedAt: brain.updatedAt,
    };
  }
}
