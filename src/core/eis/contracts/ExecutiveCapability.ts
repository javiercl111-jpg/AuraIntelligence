import type { ExecutiveCapabilityType, ExecutiveArtifactType } from '../enums';
import type { CapabilityResult } from '../types';
import type { ExecutiveContext } from './ExecutiveContext';
import type { ExecutiveArtifact } from './ExecutiveArtifact';

export interface ExecutiveCapability {
  readonly id: string;
  readonly capabilityType: ExecutiveCapabilityType;
  readonly version: number;
  readonly consumes: readonly ExecutiveArtifactType[];
  readonly produces: readonly ExecutiveArtifactType[];
  readonly prerequisites: readonly string[];
  readonly nextCapabilities: readonly string[];
  
  execute(context: Readonly<ExecutiveContext>, artifacts: readonly ExecutiveArtifact[]): Promise<CapabilityResult>;
}
