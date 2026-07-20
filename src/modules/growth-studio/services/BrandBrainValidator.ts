import type { BrandBrain, BrandBrainField } from '../types/brandBrain';

export class BrandBrainValidator {
  /**
   * Validates the internal consistency of the Brand Brain.
   * It does not block the flow due to missing business completeness (like industry or valueProposition).
   * It only verifies data structure integrity.
   */
  static validate(brain: BrandBrain): string[] {
    const errors: string[] = [];

    // 1. confidenceScore between 0 and 100
    if (brain.confidenceScore < 0 || brain.confidenceScore > 100) {
      errors.push('confidenceScore debe estar entre 0 y 100.');
    }

    // 2. coherence between value and status
    const checkField = (name: string, field?: BrandBrainField<unknown>) => {
      if (!field) return;

      if (field.status === 'missing') {
        const hasValue = field.value !== null && (Array.isArray(field.value) ? field.value.length > 0 : String(field.value).trim() !== '');
        if (hasValue) {
          errors.push(`El campo missing '${name}' no debe contener valor empresarial.`);
        }
      }

      if (field.status === 'confirmed') {
        if (!field.source && !field.evidence) {
          errors.push(`El campo confirmed '${name}' debe tener source o evidence.`);
        }
      }
    };

    checkField('companyProfile.companyName', brain.companyProfile?.companyName);
    checkField('companyProfile.businessDescription', brain.companyProfile?.businessDescription);
    checkField('industry', brain.industry);
    checkField('products', brain.products);
    checkField('valueProposition', brain.valueProposition);
    checkField('targetAudience', brain.targetAudience);
    checkField('brandTone', brain.brandTone);
    checkField('differentiators', brain.differentiators);
    checkField('communicationStyle', brain.communicationStyle);
    checkField('businessGoals', brain.businessGoals);

    // 3. knownFacts match fields not missing
    const factsFields = new Set(brain.knownFacts.map(f => f.field));
    const expectedFacts = [
      brain.companyProfile?.companyName,
      brain.companyProfile?.businessDescription,
      brain.industry,
      brain.products,
      brain.valueProposition,
      brain.targetAudience,
      brain.brandTone,
      brain.differentiators,
      brain.communicationStyle,
      brain.businessGoals
    ].filter(f => f && f.status !== 'missing').length;

    if (factsFields.size !== expectedFacts) {
      errors.push('knownFacts no coincide con la cantidad de campos no-missing.');
    }

    // 4. missingKnowledge match missing fields
    const gapsFields = new Set(brain.missingKnowledge.map(g => g.field));
    const expectedGaps = [
      brain.companyProfile?.companyName,
      brain.companyProfile?.businessDescription,
      brain.industry,
      brain.products,
      brain.valueProposition,
      brain.targetAudience,
      brain.brandTone,
      brain.differentiators,
      brain.communicationStyle,
      brain.businessGoals
    ].filter(f => !f || f.status === 'missing').length;

    if (gapsFields.size !== expectedGaps) {
      errors.push('missingKnowledge no coincide con la cantidad de campos missing.');
    }

    return errors;
  }
}
