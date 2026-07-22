import type { CapabilityError } from '../../types';

export interface DiscoveryValidationSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly error?: never;
}

export interface DiscoveryValidationFailure {
  readonly success: false;
  readonly data?: never;
  readonly error: Readonly<CapabilityError>;
}

export type DiscoveryValidationResult<T> =
  | DiscoveryValidationSuccess<T>
  | DiscoveryValidationFailure;
