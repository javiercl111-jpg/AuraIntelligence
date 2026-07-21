import type { ExecutivePriority, ExecutiveConfidence, ExecutiveDecisionStatus } from '../enums';

export interface ExecutiveDecision {
  readonly id: string;
  readonly priority: ExecutivePriority;
  readonly confidence: ExecutiveConfidence;
  readonly rationale: string;
  readonly recommendedAction: string;
  readonly status: ExecutiveDecisionStatus;
  readonly createdAt: Date;
}
