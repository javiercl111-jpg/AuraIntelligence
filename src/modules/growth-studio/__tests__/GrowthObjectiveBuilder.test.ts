import { describe, it, expect } from 'vitest';
import { GrowthObjectiveBuilder } from '../services/GrowthObjectiveBuilder';
import type { GrowthStructuredContext } from '../types/growthConversation';

describe('GrowthObjectiveBuilder', () => {
  const mockContext: GrowthStructuredContext = {
    objective: 'Vender Aura HCM',
    productOrService: 'Aura HCM',
    audience: 'Hoteles',
    expectedResult: '5 reuniones',
    region: 'Querétaro'
  };

  it('should correctly calculate completion percentage and weights', () => {
    const objective = GrowthObjectiveBuilder.buildFromContext(mockContext);

    // Critical (goal, product, audience, result) = 4 * 20 = 80
    // Recommended (region, horizon) = 1 (region) + 1 (default horizon) * 10 = 20
    // Total = 100
    expect(objective.completionPercentage).toBe(100);
    expect(objective.missingFields).not.toContain('region');
    expect(objective.missingFields).toContain('budget'); // Optional missing
  });

  it('should mark fields as inferred when not confirmed', () => {
    const objective = GrowthObjectiveBuilder.buildFromContext(mockContext, false);
    expect(objective.inferredFields).toContain('goal');
    expect(objective.confirmedFields).not.toContain('goal');
  });

  it('should mark fields as confirmed when user confirmed', () => {
    const objective = GrowthObjectiveBuilder.buildFromContext(mockContext, true);
    expect(objective.confirmedFields).toContain('goal');
    expect(objective.inferredFields).not.toContain('goal');
  });

  it('should not let missing optional fields reduce MVP completeness', () => {
    // Context without budget and constraints
    const objective = GrowthObjectiveBuilder.buildFromContext(mockContext);
    expect(objective.completionPercentage).toBe(100); // Because critical and recommended are full
  });

  it('should fail validation if critical fields are missing', () => {
    const incompleteContext: GrowthStructuredContext = {
      objective: 'Vender'
    };
    const objective = GrowthObjectiveBuilder.buildFromContext(incompleteContext);
    expect(objective.validationErrors).toContain('audience');
    expect(objective.completionPercentage).toBe(30); // Goal (20) + Horizon (10)
  });
});
