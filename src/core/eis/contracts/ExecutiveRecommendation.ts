import type { ExecutivePriority, ExecutiveConfidence } from '../enums';

export interface ExecutiveRecommendation {
  readonly id: string;
  readonly target: string;
  readonly description: string;
  readonly priority: ExecutivePriority;
  readonly confidence: ExecutiveConfidence;
  readonly alternatives: readonly string[];
  readonly createdAt: Date;
}
