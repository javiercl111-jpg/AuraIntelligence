import { describe, it, expect } from 'vitest';
import { CampaignStrategyValidator } from '../services/CampaignStrategyValidator';
import type { CampaignStrategy } from '../types/campaignStrategy';

describe('CampaignStrategyValidator', () => {
  const getValidStrategy = (): CampaignStrategy => ({
    id: '123',
    tenantId: 'tenant1',
    companyId: 'company1',
    campaignObjective: { value: 'Obj', status: 'confirmed' },
    primaryAudience: { value: 'Aud', status: 'confirmed' },
    secondaryAudience: { value: 'Sec', status: 'missing' },
    coreMessage: { value: 'Msg', status: 'confirmed' },
    valueDrivers: { value: ['Driver'], status: 'confirmed' },
    recommendedChannels: { value: ['LinkedIn'], status: 'confirmed' },
    recommendedContentTypes: { value: ['Video'], status: 'confirmed' },
    callsToAction: { value: null, status: 'missing' },
    assumptions: [],
    knowledgeGaps: [],
    strategyRisks: [],
    readinessScore: 80,
    strategyEvidenceScore: 80,
    strategyReadinessReason: 'Valid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('returns valid for a correct strategy object', () => {
    const valid = getValidStrategy();
    const result = CampaignStrategyValidator.validate(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid if ID is missing', () => {
    const invalid = getValidStrategy() as unknown as Record<string, unknown>;
    invalid.id = '';
    const result = CampaignStrategyValidator.validate(invalid as unknown as CampaignStrategy);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing strategy ID.');
  });

  it('returns invalid if readinessScore is out of bounds', () => {
    const invalid = getValidStrategy();
    invalid.readinessScore = 150;
    const result = CampaignStrategyValidator.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid readinessScore: 150');
  });

  it('returns invalid if strategyEvidenceScore is out of bounds', () => {
    const invalid = getValidStrategy();
    invalid.strategyEvidenceScore = -10;
    const result = CampaignStrategyValidator.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid strategyEvidenceScore: -10');
  });
});
