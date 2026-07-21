import type { ExecutiveArtifactType, ExecutiveConfidence, ExecutiveStatus } from '../enums';

export interface ExecutiveArtifact {
  readonly id: string;
  readonly artifactType: ExecutiveArtifactType;
  readonly version: number;
  readonly confidence: ExecutiveConfidence;
  readonly status: ExecutiveStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
