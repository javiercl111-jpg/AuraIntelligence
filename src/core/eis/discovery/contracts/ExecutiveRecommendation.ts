import type { ExecutivePriority } from '../../enums';
import type { ExecutiveConfidence } from './ExecutiveConfidence';

export interface ExecutiveRecommendation {
  readonly recommendationId: string;
  readonly title: string;
  readonly description: string;
  readonly rationale: string;
  readonly priority: ExecutivePriority;
  readonly confidence: Readonly<ExecutiveConfidence>;
  readonly evidenceIds: readonly string[];
  readonly expectedImpact: string;
  readonly timeframe: string;
  readonly linkedActionIds: readonly string[];
}
