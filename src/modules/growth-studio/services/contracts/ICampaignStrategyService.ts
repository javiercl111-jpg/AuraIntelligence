import type { CampaignStrategy } from '../../types/campaignStrategy';

export interface ICampaignStrategyService {
  buildStrategy(tenantId: string, companyId: string, objectiveId: string, brandBrainId: string, conversationId: string): Promise<CampaignStrategy>;
  getStrategy(strategyId: string): Promise<CampaignStrategy | null>;
  setResponseDelay(ms: number): void;
}
