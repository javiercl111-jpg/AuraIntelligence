import type { ContentPlan, ContentAssetPhase } from '../../types/contentPlan';

export interface IContentPlanService {
  getPlan(conversationId: string): Promise<ContentPlan | null>;
  generatePlan(conversationId: string): Promise<ContentPlan>;
  updateAssetPhase(conversationId: string, assetId: string, phase: ContentAssetPhase): Promise<ContentPlan>;
}
