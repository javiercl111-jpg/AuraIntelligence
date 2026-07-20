import type { ExecutiveContentBrief } from '../../types/executiveContentBrief';

export interface IExecutiveContentBriefService {
  getBrief(conversationId: string): Promise<ExecutiveContentBrief | null>;
  generateBrief(conversationId: string, explicitAssetId?: string): Promise<ExecutiveContentBrief>;
  approveBrief(conversationId: string, briefId: string): Promise<ExecutiveContentBrief>;
}
