import type { WorkspaceType, ExecutiveActor, ExecutiveMetadata } from '../types';
import type { ExecutiveCapabilityType, ExecutiveArtifactType } from '../enums';

export interface ExecutiveContext {
  readonly organizationId: string;
  readonly workspaceType: WorkspaceType;
  readonly actor: Readonly<ExecutiveActor>;
  readonly companyId: string;
  readonly currentCapability: ExecutiveCapabilityType;
  readonly currentArtifact?: ExecutiveArtifactType;
  readonly metadata?: ExecutiveMetadata;
}
