import type { ExecutiveMaturityLevel } from '../enums';
import type { ExecutiveConfidence } from './ExecutiveConfidence';

export interface ExecutiveMaturityDimension {
  readonly dimensionId: string;
  readonly name: string;
  readonly score: number;
  readonly rationale: string;
  readonly evidenceIds: readonly string[];
  readonly confidence: Readonly<ExecutiveConfidence>;
}

export interface ExecutiveMaturity {
  readonly overallScore: number;
  readonly level: ExecutiveMaturityLevel;
  readonly dimensions: readonly Readonly<ExecutiveMaturityDimension>[];
  readonly rationale: string;
  readonly evidenceIds: readonly string[];
  readonly confidence: Readonly<ExecutiveConfidence>;
}
