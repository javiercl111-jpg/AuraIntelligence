import type { ExecutiveExecutionPlan } from '../../types/executiveExecutionPlan';

export interface IExecutiveExecutionPlanService {
  getPlan(conversationId: string): Promise<ExecutiveExecutionPlan | null>;
  savePlan(plan: ExecutiveExecutionPlan): Promise<void>;
  generatePlan(conversationId: string): Promise<ExecutiveExecutionPlan>;
}
