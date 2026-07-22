import type { ExecutiveRiskLikelihood, ExecutiveRiskSeverity } from '../enums';
import type { ExecutiveConfidence } from './ExecutiveConfidence';

export interface ExecutiveRisk {
  readonly riskId: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly severity: ExecutiveRiskSeverity;
  readonly likelihood: ExecutiveRiskLikelihood;
  readonly impact: string;
  readonly mitigation?: string;
  readonly confidence: Readonly<ExecutiveConfidence>;
  readonly evidenceIds: readonly string[];
}
