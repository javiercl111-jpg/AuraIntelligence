import type { ExecutiveConfidenceLevel } from '../enums';

export interface ExecutiveConfidence {
  readonly level: ExecutiveConfidenceLevel;
  readonly score: number;
  readonly basis: readonly string[];
  readonly evidenceCount: number;
  readonly missingEvidenceCount: number;
  readonly calibrationVersion?: string;
}
