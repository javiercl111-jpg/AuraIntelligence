import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import type { IExecutiveExecutionPlanService } from './contracts/IExecutiveExecutionPlanService';
import { ExecutiveExecutionPlanBuilder } from './ExecutiveExecutionPlanBuilder';
import { growthObjectiveService } from './growthObjectiveMockService';
import { brandBrainMockService } from './brandBrainMockService';
import { campaignStrategyMockService } from './campaignStrategyMockService';

class ExecutiveExecutionPlanMockService implements IExecutiveExecutionPlanService {
  private plans = new Map<string, ExecutiveExecutionPlan>();

  async getPlan(conversationId: string): Promise<ExecutiveExecutionPlan | null> {
    return this.plans.get(conversationId) || null;
  }

  async savePlan(plan: ExecutiveExecutionPlan): Promise<void> {
    this.plans.set(plan.conversationId, plan);
  }

  async generatePlan(conversationId: string): Promise<ExecutiveExecutionPlan> {
    const objective = await growthObjectiveService.getObjective(`go_${conversationId}`);
    const brand = await brandBrainMockService.getBrandBrainByConversation(conversationId);
    const strategy = await campaignStrategyMockService.getStrategy(conversationId);
    
    const plan = ExecutiveExecutionPlanBuilder.build(objective, brand, strategy, conversationId);
    await this.savePlan(plan);
    return plan;
  }
}

export const executiveExecutionPlanMockService = new ExecutiveExecutionPlanMockService();
