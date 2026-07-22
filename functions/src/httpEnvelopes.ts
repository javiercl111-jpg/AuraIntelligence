import type { CapabilitySafeDetailValue } from '../../src/core/eis/types';

export const ExecutiveDiscoveryHttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ExecutiveDiscoveryApiErrorCode = {
  INVALID_METHOD: 'INVALID_METHOD',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  INVALID_JSON: 'INVALID_JSON',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  ACCESS_FORBIDDEN: 'ACCESS_FORBIDDEN',
  EXECUTIVE_DISCOVERY_FAILED: 'EXECUTIVE_DISCOVERY_FAILED',
} as const;

export interface ApiSuccessEnvelope<T> {
  readonly success: true;
  readonly data: T;
  readonly meta: {
    readonly correlationId: string;
    readonly warnings: readonly string[];
  };
}

export interface ApiErrorEnvelope {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, CapabilitySafeDetailValue>>;
  };
  readonly correlationId?: string;
}

export function successEnvelope<T>(
  data: T,
  correlationId: string,
  warnings: readonly string[],
): ApiSuccessEnvelope<T> {
  return {
    success: true,
    data,
    meta: { correlationId, warnings },
  };
}

export function errorEnvelope(
  code: string,
  message: string,
  correlationId?: string,
  details?: Readonly<Record<string, CapabilitySafeDetailValue>>,
): ApiErrorEnvelope {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    ...(correlationId === undefined ? {} : { correlationId }),
  };
}
