// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Objective Builder
// ─────────────────────────────────────────────────────────────

import type { GrowthStructuredContext } from '../types/growthConversation';
import type { GrowthObjective } from '../types/growthObjective';
import { GrowthObjectiveValidator } from './GrowthObjectiveValidator';

export class GrowthObjectiveBuilder {
  /**
   * Builds or rebuilds a GrowthObjective from the conversation context.
   *
   * Weights:
   * Critical (4 fields): 20% each = 80%
   * Recommended (2 fields): 10% each = 20%
   * Optional fields don't add to the completion percentage MVP requirement.
   */
  public static buildFromContext(
    context: GrowthStructuredContext,
    isConfirmedByUser: boolean = false,
    existingObjective?: GrowthObjective
  ): GrowthObjective {
    const now = new Date().toISOString();

    // Map context fields to objective fields
    const goal = context.objective || '';
    const productOrService = context.productOrService || '';
    const audience = context.audience || '';
    const expectedResult = context.expectedResult || '';
    const region = context.region || '';
    const budget = context.budget || '';
    const constraints = context.constraints || [];

    // Using default horizon if missing
    // We don't have horizon in context mapping currently, so it might be empty
    const horizon = existingObjective?.horizon || 'medium_term';

    // We calculate missing, confirmed, inferred lists
    const missingFields: string[] = [];
    const inferredFields: string[] = [];
    const confirmedFields: string[] = [];

    let completionPercentage = 0;

    // Helper to process fields
    const processField = (
      fieldName: string,
      value: unknown,
      weight: number,
      isOptional: boolean = false
    ) => {
      const hasValue = Array.isArray(value) ? value.length > 0 : !!(value && typeof value === 'string' && value.trim() !== '');

      if (!hasValue) {
        missingFields.push(fieldName);
      } else {
        if (!isOptional) {
          completionPercentage += weight;
        }
        if (isConfirmedByUser) {
          confirmedFields.push(fieldName);
        } else {
          inferredFields.push(fieldName);
        }
      }
    };

    // Critical (4 * 20%)
    processField('goal', goal, 20);
    processField('productOrService', productOrService, 20);
    processField('audience', audience, 20);
    processField('expectedResult', expectedResult, 20);

    // Recommended (2 * 10%)
    processField('region', region, 10);
    processField('horizon', horizon, 10);

    // Optional (0%)
    processField('budget', budget, 0, true);
    processField('constraints', constraints, 0, true);

    const partialObj: Partial<GrowthObjective> = {
      goal,
      productOrService,
      audience,
      expectedResult,
      region,
      horizon,
      budget,
      constraints,
    };

    const validationErrors = GrowthObjectiveValidator.validate(partialObj);

    return {
      id: existingObjective?.id || `go_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: existingObjective?.tenantId || 'growth_demo_tenant',
      companyId: existingObjective?.companyId || 'growth_demo_company',
      createdBy: existingObjective?.createdBy || 'growth_demo_user',
      status: existingObjective?.status || 'draft',
      goal,
      productOrService,
      audience,
      region,
      horizon,
      expectedResult,
      budget,
      constraints,
      confidence: existingObjective?.confidence || 'medium',
      schemaVersion: existingObjective?.schemaVersion || 1,
      createdAt: existingObjective?.createdAt || now,
      updatedAt: now,
      completionPercentage,
      missingFields,
      confirmedFields,
      inferredFields,
      validationErrors,
    };
  }
}
