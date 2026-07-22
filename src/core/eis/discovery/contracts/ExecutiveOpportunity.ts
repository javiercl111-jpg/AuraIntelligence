import type { ExecutiveOpportunityHorizon } from '../enums';
import type { ExecutiveConfidence } from './ExecutiveConfidence';

export interface ExecutiveOpportunity {
  readonly opportunityId: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly expectedValue: string;
  readonly feasibility: number;
  readonly horizon: ExecutiveOpportunityHorizon;
  readonly confidence: Readonly<ExecutiveConfidence>;
  readonly evidenceIds: readonly string[];
}
