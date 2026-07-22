import type { CapabilityError } from './CapabilityError';

export interface CapabilityExecutionMetadata {
  readonly capabilityId: string;
  readonly capabilityVersion: string;
  readonly providerId?: string;
  readonly providerVersion?: string;
  readonly startedAt: string;
  readonly completedAt: string;
}

interface CapabilityResultBase {
  readonly warnings: readonly string[];
  readonly correlationId: string;
  readonly executionMetadata: Readonly<CapabilityExecutionMetadata>;
  /** Retained for compatibility with the original artifact-oriented capability contract. */
  readonly artifacts?: readonly string[];
}

export interface CapabilitySuccess<T> extends CapabilityResultBase {
  readonly success: true;
  readonly result: T;
  readonly error?: never;
}

export interface CapabilityFailure extends CapabilityResultBase {
  readonly success: false;
  readonly result?: never;
  readonly error: Readonly<CapabilityError>;
}

export type CapabilityResult<T = readonly string[]> = CapabilitySuccess<T> | CapabilityFailure;
