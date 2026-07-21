import type { ExecutiveArtifactType, ExecutiveConfidence } from '../enums';

export interface ExecutiveEvidence {
  readonly artifactId: string;
  readonly artifactType: ExecutiveArtifactType;
  readonly field: string;
  readonly source: string;
  readonly confidence: ExecutiveConfidence;
  readonly evidence: string;
}
