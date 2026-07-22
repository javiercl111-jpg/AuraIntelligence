import type { Response } from 'express';
import type { Request } from 'firebase-functions/v2/https';
import type { ExecutiveDiscoveryCapability } from '../../src/core/eis/discovery';
import { ExecutiveDiscoveryErrorCode } from '../../src/core/eis/discovery';
import type { ExecutiveDiscoverySecurityConfig } from './config';
import {
  errorEnvelope,
  ExecutiveDiscoveryApiErrorCode,
  ExecutiveDiscoveryHttpStatus,
  successEnvelope,
} from './httpEnvelopes';
import type { SecurityLogger } from './observability';
import { SecurityLogOutcome } from './observability';
import {
  extractBearerToken,
  ServiceIdentityVerificationErrorCode,
  type SecurityClock,
  type ServiceAuthorizationPolicy,
  type ServiceAuthorizationTarget,
  type ServiceIdentity,
  type ServiceIdentityVerifier,
} from './security';

const REQUEST_VALIDATION_ERROR_CODES = new Set<string>([
  ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_REQUEST,
  ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_EVIDENCE,
  ExecutiveDiscoveryErrorCode.UNSUPPORTED_SCHEMA_VERSION,
]);

function sendJson(response: Response, status: number, body: unknown): void {
  response.set('Cache-Control', 'no-store');
  response.status(status).json(body);
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.get('content-type');
  if (contentType === undefined) return false;
  return contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

function parseJsonBody(request: Request): unknown {
  if (Buffer.isBuffer(request.rawBody)) {
    return JSON.parse(request.rawBody.toString('utf8')) as unknown;
  }

  if (Buffer.isBuffer(request.body)) {
    return JSON.parse(request.body.toString('utf8')) as unknown;
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as unknown;
  }

  if (request.body === undefined) {
    throw new SyntaxError('Missing JSON body');
  }

  return request.body as unknown;
}

export type EvaluateExecutiveDiscoveryV1Handler = (
  request: Request,
  response: Response,
) => Promise<void>;

export interface EvaluateExecutiveDiscoveryV1Dependencies {
  readonly capability: Pick<ExecutiveDiscoveryCapability, 'execute'>;
  readonly identityVerifier: ServiceIdentityVerifier;
  readonly authorizationPolicy: Pick<ServiceAuthorizationPolicy, 'authorize'>;
  readonly securityConfig: ExecutiveDiscoverySecurityConfig;
  readonly securityLogger: SecurityLogger;
  readonly clock: SecurityClock;
}

interface RequestAuthorizationContext extends ServiceAuthorizationTarget {
  readonly requestId?: string;
  readonly correlationId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validatedLogIdentifier(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value)
    ? value
    : undefined;
}

function extractAuthorizationContext(
  input: unknown,
): RequestAuthorizationContext | undefined {
  if (
    !isRecord(input) ||
    !isNonEmptyString(input.tenantId) ||
    !isNonEmptyString(input.organizationId) ||
    !isNonEmptyString(input.companyId)
  ) {
    return undefined;
  }

  return {
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    companyId: input.companyId,
    requestId: validatedLogIdentifier(input.requestId),
    correlationId: validatedLogIdentifier(input.correlationId),
  };
}

function durationMilliseconds(clock: SecurityClock, startedAt: number): number {
  return Math.max(0, (clock.nowEpochSeconds() - startedAt) * 1_000);
}

function sendAuthenticationFailure(
  response: Response,
  forbidden: boolean,
): void {
  sendJson(
    response,
    forbidden
      ? ExecutiveDiscoveryHttpStatus.FORBIDDEN
      : ExecutiveDiscoveryHttpStatus.UNAUTHENTICATED,
    errorEnvelope(
      forbidden
        ? ExecutiveDiscoveryApiErrorCode.ACCESS_FORBIDDEN
        : ExecutiveDiscoveryApiErrorCode.AUTHENTICATION_REQUIRED,
      forbidden
        ? 'The service is not authorized for this request.'
        : 'Service authentication is required.',
    ),
  );
}

export function createEvaluateExecutiveDiscoveryV1Handler(
  dependencies: EvaluateExecutiveDiscoveryV1Dependencies,
): EvaluateExecutiveDiscoveryV1Handler {
  if (!dependencies.securityConfig.authorizationHeaderRequired) {
    throw new Error('Executive Discovery requires service authentication.');
  }

  return async (request, response): Promise<void> => {
    const securityStartedAt = dependencies.clock.nowEpochSeconds();

    if (request.method.toUpperCase() !== 'POST') {
      response.set('Allow', 'POST');
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.BAD_REQUEST,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.INVALID_METHOD,
          'Only POST requests are accepted.',
        ),
      );
      return;
    }

    if (!hasJsonContentType(request)) {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.BAD_REQUEST,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.INVALID_CONTENT_TYPE,
          'Content-Type must be application/json.',
        ),
      );
      return;
    }

    const bearerToken = extractBearerToken(request.get('authorization'));
    if (!bearerToken.success) {
      dependencies.securityLogger.log({
        outcome: SecurityLogOutcome.AUTHENTICATION_FAILED,
        errorCode: bearerToken.error.code,
        durationMs: durationMilliseconds(
          dependencies.clock,
          securityStartedAt,
        ),
      });
      sendAuthenticationFailure(response, false);
      return;
    }

    let verification: Awaited<
      ReturnType<ServiceIdentityVerifier['verify']>
    >;
    try {
      verification = await dependencies.identityVerifier.verify(
        bearerToken.token,
        dependencies.securityConfig,
      );
    } catch {
      dependencies.securityLogger.log({
        outcome: SecurityLogOutcome.AUTHENTICATION_FAILED,
        errorCode:
          ServiceIdentityVerificationErrorCode.INTERNAL_IDENTITY_ERROR,
        durationMs: durationMilliseconds(
          dependencies.clock,
          securityStartedAt,
        ),
      });
      sendAuthenticationFailure(response, false);
      return;
    }

    if (!verification.success) {
      const forbidden =
        verification.error.code ===
        ServiceIdentityVerificationErrorCode.CALLER_NOT_ALLOWED;
      dependencies.securityLogger.log({
        outcome: SecurityLogOutcome.AUTHENTICATION_FAILED,
        errorCode: verification.error.code,
        durationMs: durationMilliseconds(
          dependencies.clock,
          securityStartedAt,
        ),
      });
      sendAuthenticationFailure(response, forbidden);
      return;
    }

    let input: unknown;
    try {
      input = parseJsonBody(request);
    } catch {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.BAD_REQUEST,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.INVALID_JSON,
          'The request body must contain valid JSON.',
        ),
      );
      return;
    }

    const authorizationContext = extractAuthorizationContext(input);
    if (authorizationContext === undefined) {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.UNPROCESSABLE_ENTITY,
        errorEnvelope(
          ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_REQUEST,
          'The Executive Discovery request is invalid.',
        ),
      );
      return;
    }

    const authorization = dependencies.authorizationPolicy.authorize(
      verification.identity,
      authorizationContext,
    );
    if (!authorization.allowed) {
      logAuthorizationResult(
        dependencies,
        verification.identity,
        authorizationContext,
        SecurityLogOutcome.AUTHORIZATION_FAILED,
        securityStartedAt,
        authorization.error.code,
      );
      sendAuthenticationFailure(response, true);
      return;
    }

    logAuthorizationResult(
      dependencies,
      verification.identity,
      authorizationContext,
      SecurityLogOutcome.AUTHORIZED,
      securityStartedAt,
    );

    try {
      const result = await dependencies.capability.execute(input);
      if (result.success) {
        sendJson(
          response,
          ExecutiveDiscoveryHttpStatus.OK,
          successEnvelope(result.result, result.correlationId, result.warnings),
        );
        return;
      }

      if (REQUEST_VALIDATION_ERROR_CODES.has(result.error.code)) {
        sendJson(
          response,
          ExecutiveDiscoveryHttpStatus.UNPROCESSABLE_ENTITY,
          errorEnvelope(
            result.error.code,
            result.error.message,
            result.correlationId,
            result.error.safeDetails,
          ),
        );
        return;
      }

      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.INTERNAL_SERVER_ERROR,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.EXECUTIVE_DISCOVERY_FAILED,
          'Executive Discovery could not complete the request.',
          result.correlationId,
        ),
      );
    } catch {
      sendJson(
        response,
        ExecutiveDiscoveryHttpStatus.INTERNAL_SERVER_ERROR,
        errorEnvelope(
          ExecutiveDiscoveryApiErrorCode.EXECUTIVE_DISCOVERY_FAILED,
          'Executive Discovery could not complete the request.',
        ),
      );
    }
  };
}

function logAuthorizationResult(
  dependencies: EvaluateExecutiveDiscoveryV1Dependencies,
  identity: ServiceIdentity,
  context: RequestAuthorizationContext,
  outcome: typeof SecurityLogOutcome.AUTHORIZED | typeof SecurityLogOutcome.AUTHORIZATION_FAILED,
  startedAt: number,
  errorCode?: string,
): void {
  dependencies.securityLogger.log({
    correlationId: context.correlationId,
    requestId: context.requestId,
    callerSubject: identity.subject,
    issuer: identity.issuer,
    audience: identity.audience,
    environment: identity.environment,
    tenantId: context.tenantId,
    organizationId: context.organizationId,
    companyId: context.companyId,
    outcome,
    ...(errorCode === undefined ? {} : { errorCode }),
    durationMs: durationMilliseconds(dependencies.clock, startedAt),
  });
}
