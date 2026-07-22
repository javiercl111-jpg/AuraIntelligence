export const ServiceAuthorizationErrorCode = {
  TENANT_NOT_AUTHORIZED: 'TENANT_NOT_AUTHORIZED',
  ORGANIZATION_NOT_AUTHORIZED: 'ORGANIZATION_NOT_AUTHORIZED',
  COMPANY_NOT_AUTHORIZED: 'COMPANY_NOT_AUTHORIZED',
  ENVIRONMENT_NOT_AUTHORIZED: 'ENVIRONMENT_NOT_AUTHORIZED',
  CLAIMS_VERSION_UNSUPPORTED: 'CLAIMS_VERSION_UNSUPPORTED',
  SUBJECT_NOT_AUTHORIZED: 'SUBJECT_NOT_AUTHORIZED',
} as const;

export type ServiceAuthorizationErrorCode =
  (typeof ServiceAuthorizationErrorCode)[keyof typeof ServiceAuthorizationErrorCode];

export interface ServiceAuthorizationSuccess {
  readonly allowed: true;
}

export interface ServiceAuthorizationFailure {
  readonly allowed: false;
  readonly error: {
    readonly code: ServiceAuthorizationErrorCode;
    readonly message: string;
  };
}

export type ServiceAuthorizationResult =
  | ServiceAuthorizationSuccess
  | ServiceAuthorizationFailure;

export function authorizationFailure(
  code: ServiceAuthorizationErrorCode,
): ServiceAuthorizationFailure {
  return {
    allowed: false,
    error: {
      code,
      message: 'The service identity is not authorized for this request.',
    },
  };
}
