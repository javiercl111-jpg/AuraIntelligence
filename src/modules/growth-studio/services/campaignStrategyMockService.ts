import type { CampaignStrategy } from '../types/campaignStrategy';
import type { ICampaignStrategyService } from './contracts/ICampaignStrategyService';
import { CampaignStrategyBuilder } from './CampaignStrategyBuilder';
import { CampaignStrategyValidator } from './CampaignStrategyValidator';

import * as goMock from './growthObjectiveMockService';
import * as bbMock from './brandBrainMockService';
import * as gcMock from './growthConversationMockService';

class CampaignStrategyMockService implements ICampaignStrategyService {
  private strategies = new Map<string, CampaignStrategy>();
  private responseDelayMs: number = 0;

  public setResponseDelay(ms: number) {
    this.responseDelayMs = ms;
  }

  async buildStrategy(
    tenantId: string,
    companyId: string,
    objectiveId: string,
    brandBrainId: string,
    conversationId: string
  ): Promise<CampaignStrategy> {
    if (this.responseDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.responseDelayMs));
    }

    const objective = await goMock.growthObjectiveService.getObjective(objectiveId);
    const brandBrain = await bbMock.brandBrainMockService.getProfile(brandBrainId);
    const conversation = await gcMock.growthConversationService.getConversation(conversationId);

    const built = CampaignStrategyBuilder.buildStrategy(
      tenantId,
      companyId,
      objective,
      brandBrain,
      conversation
    );

    // Maintain consistent ID per conversation to act as single active strategy
    const id = `cs_${conversationId}`;
    const strategy = { ...built, id };

    const validation = CampaignStrategyValidator.validate(strategy);
    if (!validation.valid) {
      console.warn('Campaign Strategy validation warnings:', validation.errors);
    }

    this.strategies.set(id, strategy);
    return strategy;
  }

  async getStrategy(strategyId: string): Promise<CampaignStrategy | null> {
    return this.strategies.get(strategyId) || null;
  }
}

export const campaignStrategyMockService = new CampaignStrategyMockService();
