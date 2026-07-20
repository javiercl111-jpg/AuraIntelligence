import type {
  BrandBrain,
  BrandBrainField,
  BrandBrainFieldStatus,
  KnownFact,
  KnowledgeGap,
  CompanyProfile
} from '../types/brandBrain';
import type { GrowthStructuredContext } from '../types/growthConversation';

const WEIGHTS = {
  companyProfile: 10,
  industry: 15,
  products: 15,
  valueProposition: 15,
  targetAudience: 15,
  brandTone: 10,
  differentiators: 10,
  communicationStyle: 5,
  businessGoals: 5
};

export class BrandBrainBuilder {
  /**
   * Calculates confidence score between 0 and 100 based on weights and status.
   */
  static calculateConfidenceScore(brain: Partial<BrandBrain>): number {
    let score = 0;
    const calc = (status?: BrandBrainFieldStatus, weight: number = 0) => {
      if (status === 'confirmed') return weight;
      if (status === 'inferred') return weight * 0.4;
      return 0;
    };

    // Calculate companyProfile score (average of its two subfields)
    let companyScore = 0;
    if (brain.companyProfile) {
      const c1 = calc(brain.companyProfile.companyName.status, WEIGHTS.companyProfile / 2);
      const c2 = calc(brain.companyProfile.businessDescription.status, WEIGHTS.companyProfile / 2);
      companyScore = c1 + c2;
    }

    score += companyScore;
    score += calc(brain.industry?.status, WEIGHTS.industry);
    score += calc(brain.products?.status, WEIGHTS.products);
    score += calc(brain.valueProposition?.status, WEIGHTS.valueProposition);
    score += calc(brain.targetAudience?.status, WEIGHTS.targetAudience);
    score += calc(brain.brandTone?.status, WEIGHTS.brandTone);
    score += calc(brain.differentiators?.status, WEIGHTS.differentiators);
    score += calc(brain.communicationStyle?.status, WEIGHTS.communicationStyle);
    score += calc(brain.businessGoals?.status, WEIGHTS.businessGoals);

    return Math.round(score);
  }

  static createMissingField<T>(): BrandBrainField<T> {
    return {
      value: null,
      status: 'missing',
      confidence: 'low'
    };
  }

  /**
   * Generates lists of known facts and knowledge gaps from fields.
   */
  static extractFactsAndGaps(brain: Partial<BrandBrain>): { knownFacts: KnownFact[], missingKnowledge: KnowledgeGap[] } {
    const knownFacts: KnownFact[] = [];
    const missingKnowledge: KnowledgeGap[] = [];

    const process = (field: string, label: string, data: BrandBrainField<unknown> | undefined, importance: 'high' | 'medium' | 'low') => {
      if (!data) return;
      if (data.status === 'missing') {
        missingKnowledge.push({ field, label, importance });
      } else {
        knownFacts.push({ field, value: data.value, status: data.status, source: data.source });
      }
    };

    if (brain.companyProfile) {
      process('companyProfile.companyName', 'Nombre de la Empresa', brain.companyProfile.companyName, 'high');
      process('companyProfile.businessDescription', 'Descripción de Negocio', brain.companyProfile.businessDescription, 'high');
    }

    process('industry', 'Industria', brain.industry, 'high');
    process('products', 'Productos/Servicios', brain.products, 'high');
    process('valueProposition', 'Propuesta de Valor', brain.valueProposition, 'high');
    process('targetAudience', 'Audiencia Objetivo', brain.targetAudience, 'high');
    process('brandTone', 'Tono de Marca', brain.brandTone, 'medium');
    process('differentiators', 'Diferenciadores', brain.differentiators, 'medium');
    process('communicationStyle', 'Estilo de Comunicación', brain.communicationStyle, 'low');
    process('businessGoals', 'Metas de Negocio', brain.businessGoals, 'medium');

    return { knownFacts, missingKnowledge };
  }

  static buildFromContext(context: GrowthStructuredContext, existingBrain?: BrandBrain, explicitConfirmations?: Record<string, boolean>): BrandBrain {
    const base = existingBrain || {
      id: `bb_${Date.now()}`,
      tenantId: 'default',
      companyId: 'default',
      createdAt: new Date().toISOString()
    };

    // Helper to merge fields
    const mergeField = <T>(
      fieldName: string,
      existing: BrandBrainField<T> | undefined,
      newValue: T | null,
      isMissingFallback: boolean,
      sourceStr?: string,
      evidenceStr?: string
    ): BrandBrainField<T> => {
      // If it's already confirmed, and no explicit re-confirmation/correction changes it to something else, keep it confirmed.
      // Wait, the requirement says: "Solo pueden convertirse en confirmed los campos: visibles, no missing, con evidencia, y aceptados explícitamente".
      let newStatus: BrandBrainFieldStatus = 'inferred';

      const hasValue = newValue !== null && (Array.isArray(newValue) ? newValue.length > 0 : String(newValue).trim() !== '');

      if (!hasValue) {
        newStatus = 'missing';
      }

      // If missing fallback is true and we don't have existing confirmed data
      if (isMissingFallback && (!existing || existing.status === 'missing') && !hasValue) {
        return this.createMissingField<T>();
      }

      // If user explicitly confirms this field
      if (explicitConfirmations && explicitConfirmations[fieldName] === true) {
        if (hasValue && evidenceStr) {
          newStatus = 'confirmed';
        } else if (existing?.status === 'confirmed') {
          newStatus = 'confirmed';
        }
      } else if (existing?.status === 'confirmed') {
        newStatus = 'confirmed';
      }

      // Missing never becomes confirmed automatically
      if (newStatus === 'confirmed' && !hasValue) {
        newStatus = 'missing';
      }

      return {
        value: hasValue ? newValue : (existing?.value || null),
        status: newStatus,
        confidence: newStatus === 'confirmed' ? 'high' : (newStatus === 'inferred' ? 'medium' : 'low'),
        source: sourceStr || existing?.source,
        evidence: evidenceStr || existing?.evidence
      };
    };

    const companyProfile: CompanyProfile = {
      companyName: mergeField<string>('companyProfile.companyName', existingBrain?.companyProfile?.companyName, null, true),
      businessDescription: mergeField<string>('companyProfile.businessDescription', existingBrain?.companyProfile?.businessDescription, null, true)
    };

    let industryValue = existingBrain?.industry?.value || null;
    let indSource = existingBrain?.industry?.source;
    let indEvidence = existingBrain?.industry?.evidence;
    if (context.additionalData?.industry) {
      industryValue = context.additionalData.industry as string;
      indSource = 'user_correction';
      indEvidence = `Corregido por el usuario: ${industryValue}`;
    }
    const industry = mergeField<string>('industry', existingBrain?.industry, industryValue, true, indSource, indEvidence);

    // Growth Objective product extraction
    let productsValue = existingBrain?.products?.value || [];
    let productSource = existingBrain?.products?.source;
    let productEvidence = existingBrain?.products?.evidence;

    if (context.productOrService) {
      if (!productsValue.includes(context.productOrService)) {
        productsValue = [...productsValue, context.productOrService];
      }
      productSource = 'growth_objective';
      productEvidence = `Extraído del objetivo de crecimiento: ${context.productOrService}`;
    }
    const products = mergeField<string[]>('products', existingBrain?.products, productsValue, false, productSource, productEvidence);

    let vpValue = existingBrain?.valueProposition?.value || null;
    let vpSource = existingBrain?.valueProposition?.source;
    let vpEvidence = existingBrain?.valueProposition?.evidence;
    if (context.additionalData?.valueProposition) {
      vpValue = context.additionalData.valueProposition as string;
      vpSource = 'user_correction';
      vpEvidence = `Corregido por el usuario: ${vpValue}`;
    }
    const valueProposition = mergeField<string>('valueProposition', existingBrain?.valueProposition, vpValue, true, vpSource, vpEvidence);

    // Target audience extracted from objective
    let audienceValue = existingBrain?.targetAudience?.value || null;
    let audienceSource = existingBrain?.targetAudience?.source;
    let audienceEvidence = existingBrain?.targetAudience?.evidence;

    if (context.audience) {
      audienceValue = context.audience;
      audienceSource = 'growth_objective';
      audienceEvidence = `Extraído del objetivo de crecimiento: ${context.audience}`;
    }
    const targetAudience = mergeField<string>('targetAudience', existingBrain?.targetAudience, audienceValue, false, audienceSource, audienceEvidence);

    const brandTone = mergeField<string>('brandTone', existingBrain?.brandTone, null, true);

    let diffValue = existingBrain?.differentiators?.value || null;
    let diffSource = existingBrain?.differentiators?.source;
    let diffEvidence = existingBrain?.differentiators?.evidence;
    if (context.additionalData?.differentiators) {
      diffValue = context.additionalData.differentiators as string[];
      diffSource = 'user_correction';
      diffEvidence = `Corregido por el usuario: ${diffValue.join(', ')}`;
    }
    const differentiators = mergeField<string[]>('differentiators', existingBrain?.differentiators, diffValue, true, diffSource, diffEvidence);

    const communicationStyle = mergeField<string>('communicationStyle', existingBrain?.communicationStyle, null, true);

    // Business goals extracted from objective
    let businessGoalsValue = existingBrain?.businessGoals?.value || [];
    let bgSource = existingBrain?.businessGoals?.source;
    let bgEvidence = existingBrain?.businessGoals?.evidence;

    if (context.expectedResult) {
      if (!businessGoalsValue.includes(context.expectedResult)) {
        businessGoalsValue = [...businessGoalsValue, context.expectedResult];
      }
      bgSource = 'growth_objective';
      bgEvidence = `Extraído del objetivo de crecimiento: ${context.expectedResult}`;
    }
    const businessGoals = mergeField<string[]>('businessGoals', existingBrain?.businessGoals, businessGoalsValue, false, bgSource, bgEvidence);

    const draftBrain: Partial<BrandBrain> = {
      ...base,
      companyProfile,
      industry,
      products,
      valueProposition,
      targetAudience,
      brandTone,
      differentiators,
      communicationStyle,
      businessGoals
    };

    const { knownFacts, missingKnowledge } = this.extractFactsAndGaps(draftBrain);
    const confidenceScore = this.calculateConfidenceScore(draftBrain);

    return {
      ...draftBrain,
      knownFacts,
      missingKnowledge,
      confidenceScore,
      updatedAt: new Date().toISOString()
    } as BrandBrain;
  }
}
