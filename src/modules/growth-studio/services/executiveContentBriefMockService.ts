import type { ExecutiveContentBrief } from '../types/executiveContentBrief';
import type { IExecutiveContentBriefService } from './contracts/IExecutiveContentBriefService';
import { ExecutiveContentBriefBuilder } from './ExecutiveContentBriefBuilder';
import { growthObjectiveService as growthObjectiveMockService } from './growthObjectiveMockService';
import { brandBrainMockService } from './brandBrainMockService';
import { campaignStrategyMockService } from './campaignStrategyMockService';
import { executiveExecutionPlanMockService } from './executiveExecutionPlanMockService';
import { contentPlanMockService } from './contentPlanMockService';

class ExecutiveContentBriefMockService implements IExecutiveContentBriefService {
  private briefs = new Map<string, ExecutiveContentBrief>();

  async getBrief(conversationId: string): Promise<ExecutiveContentBrief | null> {
    return this.briefs.get(conversationId) || null;
  }

  async generateBrief(conversationId: string, explicitAssetId?: string): Promise<ExecutiveContentBrief> {
    // 1. Fetch dependencies
    const objective = await growthObjectiveMockService.getObjective(conversationId);
    const brand = await brandBrainMockService.getBrandBrainByConversation(conversationId);
    const strategy = await campaignStrategyMockService.getStrategy(conversationId);
    const execution = await executiveExecutionPlanMockService.getPlan(conversationId);
    const plan = await contentPlanMockService.getPlan(conversationId);

    // 2. Build brief
    const brief = ExecutiveContentBriefBuilder.build(objective, brand, strategy, execution, plan, conversationId, explicitAssetId);

    // 3. Store and return
    this.briefs.set(conversationId, brief);
    return brief;
  }

  async approveBrief(conversationId: string, briefId: string): Promise<ExecutiveContentBrief> {
    const brief = this.briefs.get(conversationId);
    if (!brief) throw new Error('Brief no encontrado');
    if (brief.id !== briefId) throw new Error('Brief ID no coincide');

    brief.status = 'approved';

    // Update next action
    if (brief.nextGenerationAction) {
      brief.nextGenerationAction = {
        action: 'generate_asset',
        assetId: brief.selectedAssetId,
        label: 'Generar Activo con IA',
        isEnabled: true
      };
    }

    return brief;
  }
}

export const executiveContentBriefMockService = new ExecutiveContentBriefMockService();
