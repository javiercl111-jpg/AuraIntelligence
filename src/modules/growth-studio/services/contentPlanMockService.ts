import type { ContentPlan, ContentAssetPhase } from '../types/contentPlan';
import type { IContentPlanService } from './contracts/IContentPlanService';
import { ContentPlanBuilder } from './ContentPlanBuilder';
import { growthObjectiveService as growthObjectiveMockService } from './growthObjectiveMockService';
import { brandBrainMockService } from './brandBrainMockService';
import { campaignStrategyMockService } from './campaignStrategyMockService';
import { executiveExecutionPlanMockService } from './executiveExecutionPlanMockService';

class ContentPlanMockService implements IContentPlanService {
  private plans = new Map<string, ContentPlan>();

  async getPlan(conversationId: string): Promise<ContentPlan | null> {
    const existing = this.plans.get(conversationId);
    if (existing) return existing;
    return this.generatePlan(conversationId);
  }

  async generatePlan(conversationId: string): Promise<ContentPlan> {
    const objective = await growthObjectiveMockService.getObjective(`go_${conversationId}`);
    const brand = await brandBrainMockService.getBrandBrainByConversation(conversationId);
    const strategy = await campaignStrategyMockService.getStrategy(conversationId);
    const execution = await executiveExecutionPlanMockService.getPlan(conversationId);

    const plan = ContentPlanBuilder.build(objective, brand, strategy, execution, conversationId);
    this.plans.set(conversationId, plan);
    return plan;
  }

  async updateAssetPhase(conversationId: string, assetId: string, phase: ContentAssetPhase): Promise<ContentPlan> {
    const plan = this.plans.get(conversationId);
    if (!plan) throw new Error('Plan no encontrado');

    const asset = plan.contentAssets.find(a => a.id === assetId);
    if (asset) {
      asset.phase = phase;

      // Update knownAssets / missingAssets manually for mock
      if (phase === 'ready') {
        const missingIdx = plan.missingAssets.findIndex(a => a.id === assetId);
        if (missingIdx !== -1) {
          plan.missingAssets.splice(missingIdx, 1);
        }
        if (!plan.knownAssets.find(a => a.id === assetId)) {
          plan.knownAssets.push(asset);
        }
      }
    }

    // Re-evaluar builder status no es 100% posible sin todo el contexto, pero en memoria nos basta
    this.plans.set(conversationId, plan);
    return plan;
  }
}

export const contentPlanMockService = new ContentPlanMockService();
