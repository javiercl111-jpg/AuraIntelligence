import { describe, it, expect } from 'vitest';
import { GrowthObjectiveValidator } from '../services/GrowthObjectiveValidator';
import type { GrowthObjective } from '../types/growthObjective';

describe('GrowthObjectiveValidator', () => {
  it('should return empty array when all critical fields are present', () => {
    const objective: Partial<GrowthObjective> = {
      goal: 'Vender más',
      productOrService: 'Aura HCM',
      audience: 'Hoteles',
      expectedResult: '10 ventas'
    };
    const errors = GrowthObjectiveValidator.validate(objective);
    expect(errors).toEqual([]);
  });

  it('should identify missing fields', () => {
    const objective: Partial<GrowthObjective> = {
      goal: 'Vender más',
      expectedResult: '10 ventas'
    };
    const errors = GrowthObjectiveValidator.validate(objective);
    expect(errors).toContain('productOrService');
    expect(errors).toContain('audience');
  });

  it('should fail on empty strings', () => {
    const objective: Partial<GrowthObjective> = {
      goal: ' ',
      productOrService: '',
      audience: 'Hoteles',
      expectedResult: '10 ventas'
    };
    const errors = GrowthObjectiveValidator.validate(objective);
    expect(errors).toContain('goal');
    expect(errors).toContain('productOrService');
  });
});
