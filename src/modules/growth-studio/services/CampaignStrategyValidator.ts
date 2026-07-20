import type { CampaignStrategy } from '../types/campaignStrategy';

export class CampaignStrategyValidator {
  public static validate(strategy: CampaignStrategy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!strategy.id) errors.push('Missing strategy ID.');
    if (!strategy.tenantId) errors.push('Missing tenant ID.');
    if (!strategy.companyId) errors.push('Missing company ID.');

    if (!strategy.campaignObjective) errors.push('Missing campaignObjective field.');
    if (!strategy.primaryAudience) errors.push('Missing primaryAudience field.');
    if (!strategy.coreMessage) errors.push('Missing coreMessage field.');

    if (strategy.readinessScore < 0 || strategy.readinessScore > 100) {
      errors.push(`Invalid readinessScore: ${strategy.readinessScore}`);
    }
    
    if (strategy.strategyEvidenceScore < 0 || strategy.strategyEvidenceScore > 100) {
      errors.push(`Invalid strategyEvidenceScore: ${strategy.strategyEvidenceScore}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
