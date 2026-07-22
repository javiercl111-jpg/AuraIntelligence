import type { ServiceIdentity } from './ServiceIdentity';

export const ServiceIdentityVerificationErrorCode = {
  MISSING_AUTHORIZATION: 'MISSING_AUTHORIZATION',
  INVALID_AUTHORIZATION_SCHEME: 'INVALID_AUTHORIZATION_SCHEME',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_ISSUER: 'INVALID_ISSUER',
  INVALID_AUDIENCE: 'INVALID_AUDIENCE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  CALLER_NOT_ALLOWED: 'CALLER_NOT_ALLOWED',
  UNSUPPORTED_AUTH_METHOD: 'UNSUPPORTED_AUTH_METHOD',
  INTERNAL_IDENTITY_ERROR: 'INTERNAL_IDENTITY_ERROR',
} as const;

export type ServiceIdentityVerificationErrorCode =
  (typeof ServiceIdentityVerificationErrorCode)[keyof typeof ServiceIdentityVerificationErrorCode];

export interface ServiceIdentityVerificationSuccess {
  readonly success: true;
  readonly identity: ServiceIdentity;
}

export interface ServiceIdentityVerificationFailure {
  readonly success: false;
  readonly error: {
    readonly code: ServiceIdentityVerificationErrorCode;
    readonly message: string;
  };
}

export type ServiceIdentityVerificationResult =
  | ServiceIdentityVerificationSuccess
  | ServiceIdentityVerificationFailure;

export function identityVerificationFailure(
  code: ServiceIdentityVerificationErrorCode,
): ServiceIdentityVerificationFailure {
  return {
    success: false,
    error: {
      code,
      message: 'The service identity could not be verified.',
    },
  };
}
