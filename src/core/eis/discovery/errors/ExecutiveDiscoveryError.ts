import type { CapabilityError } from '../../types';

export const ExecutiveDiscoveryErrorCode = {
  INVALID_DISCOVERY_REQUEST: 'INVALID_DISCOVERY_REQUEST',
  INVALID_DISCOVERY_EVIDENCE: 'INVALID_DISCOVERY_EVIDENCE',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  REASONING_PROVIDER_FAILURE: 'REASONING_PROVIDER_FAILURE',
  INVALID_DIAGNOSIS: 'INVALID_DIAGNOSIS',
  EVIDENCE_REFERENCE_MISMATCH: 'EVIDENCE_REFERENCE_MISMATCH',
  UNSUPPORTED_SCHEMA_VERSION: 'UNSUPPORTED_SCHEMA_VERSION',
  INTERNAL_CAPABILITY_ERROR: 'INTERNAL_CAPABILITY_ERROR',
} as const;

export type ExecutiveDiscoveryErrorCode =
  (typeof ExecutiveDiscoveryErrorCode)[keyof typeof ExecutiveDiscoveryErrorCode];

export class ExecutiveDiscoveryError extends Error {
  readonly capabilityError: Readonly<CapabilityError>;

  constructor(capabilityError: Readonly<CapabilityError>) {
    super(capabilityError.message);
    this.name = 'ExecutiveDiscoveryError';
    this.capabilityError = capabilityError;
  }
}
