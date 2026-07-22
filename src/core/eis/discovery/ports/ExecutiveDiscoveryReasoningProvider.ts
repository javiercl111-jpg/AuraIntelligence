import type { ExecutiveDiagnosis, ExecutiveDiscoveryRequest } from '../contracts';

export type ExecutiveDiscoveryIdScope =
  | 'diagnosis'
  | 'risk'
  | 'opportunity'
  | 'recommendation'
  | 'action';

export interface ExecutiveDiscoveryClock {
  now(): string;
}

export interface ExecutiveDiscoveryIdFactory {
  createId(scope: ExecutiveDiscoveryIdScope, seed: string): string;
}

export interface ExecutiveDiscoveryReasoningContext {
  readonly generatedAt: string;
  readonly idFactory: ExecutiveDiscoveryIdFactory;
}

export interface ExecutiveDiscoveryReasoningProvider {
  readonly providerId: string;
  readonly providerVersion: string;
  reason(
    request: ExecutiveDiscoveryRequest,
    context: Readonly<ExecutiveDiscoveryReasoningContext>,
  ): Promise<ExecutiveDiagnosis>;
}
