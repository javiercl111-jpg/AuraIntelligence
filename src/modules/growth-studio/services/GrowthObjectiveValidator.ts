// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Objective Validator
// ─────────────────────────────────────────────────────────────

import type { GrowthObjective } from '../types/growthObjective';

export class GrowthObjectiveValidator {
  /**
   * Validates a Growth Objective to ensure critical fields are present.
   * Returns a list of missing critical field names.
   */
  public static validate(objective: Partial<GrowthObjective>): string[] {
    const errors: string[] = [];

    if (!objective.goal?.trim()) errors.push('goal');
    if (!objective.productOrService?.trim()) errors.push('productOrService');
    if (!objective.audience?.trim()) errors.push('audience');
    if (!objective.expectedResult?.trim()) errors.push('expectedResult');

    return errors;
  }
}
