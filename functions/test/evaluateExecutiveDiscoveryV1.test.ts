import type { Response } from 'express';
import type { Request } from 'firebase-functions/v2/https';
import { describe, expect, it, vi } from 'vitest';
import type {
  ExecutiveDiagnosis,
  ExecutiveDiscoveryRequest,
  ExecutiveDiscoveryReasoningProvider,
} from '../../src/core/eis/discovery';
import {
  DeterministicExecutiveDiscoveryReasoningProvider,
  DiscoveryEvidenceClassification,
  DiscoveryEvidenceSourceType,
  ExecutiveDiscoveryCapability,
} from '../../src/core/eis/discovery';
import { createEvaluateExecutiveDiscoveryV1Handler } from '../src/evaluateExecutiveDiscoveryV1';
import type { ExecutiveDiscoverySecurityConfig } from '../src/config';
import {
  ExecutiveDiscoveryApiErrorCode,
  ExecutiveDiscoveryHttpStatus,
} from '../src/httpEnvelopes';
import {
  SecurityLogOutcome,
  type SecurityLogger,
} from '../src/observability';
import {
  SecurityEnvironment,
  ServiceAuthenticationMethod,
  ServiceAuthorizationPolicy,
  ServiceIdentityVerificationErrorCode,
  identityVerificationFailure,
  type SecurityClock,
  type ServiceIdentity,
  type ServiceIdentityVerifier,
} from '../src/security';

const FIXED_TIME = '2026-07-21T18:00:00.000Z';
const TEST_TOKEN = 'test-service-token-value';

const securityClock: SecurityClock = { nowEpochSeconds: () => 1_000 };

const securityConfig: ExecutiveDiscoverySecurityConfig = {
  environment: SecurityEnvironment.TEST,
  allowedIssuers: ['https://issuer.example.test'],
  allowedAudiences: ['aura-intelligence'],
  allowedSubjects: ['control-center-backend'],
  subjectTenantGrants: { 'control-center-backend': ['tenant-001'] },
  subjectOrganizationGrants: {
    'control-center-backend': ['organization-001'],
  },
  subjectCompanyGrants: { 'control-center-backend': ['company-001'] },
  allowDevelopmentVerifier: true,
  clockSkewSeconds: 30,
  tokenMaxAgeSeconds: 300,
  claimsVersion: '1',
  authorizationHeaderRequired: true,
  oidcAlgorithms: [],
  developmentCredentials: [
    { token: TEST_TOKEN, subject: 'control-center-backend' },
  ],
};

const serviceIdentity: ServiceIdentity = {
  subject: 'control-center-backend',
  issuer: 'https://issuer.example.test',
  audience: ['aura-intelligence'],
  authenticationMethod: ServiceAuthenticationMethod.TEST,
  environment: SecurityEnvironment.TEST,
  authorizedTenantIds: ['tenant-001'],
  authorizedOrganizationIds: ['organization-001'],
  authorizedCompanyIds: ['company-001'],
  claimsVersion: '1',
};

const identityVerifier: ServiceIdentityVerifier = {
  verify: async (token) =>
    token === TEST_TOKEN
      ? { success: true, identity: serviceIdentity }
      : identityVerificationFailure(
          ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
        ),
};

const noOpSecurityLogger: SecurityLogger = { log: () => undefined };

function createValidRequest(): ExecutiveDiscoveryRequest {
  return {
    schemaVersion: '1.0',
    capabilityVersion: '1.0.0',
    requestId: 'request-001',
    correlationId: 'correlation-001',
    idempotencyKey: 'idempotency-001',
    organizationId: 'organization-001',
    tenantId: 'tenant-001',
    companyId: 'company-001',
    sessionId: 'session-001',
    discoveryDefinitionVersion: 'definition-001',
    locale: 'es-MX',
    requestedAt: FIXED_TIME,
    evidence: [
      {
        evidenceId: 'evidence-confirmed',
        sourceType: DiscoveryEvidenceSourceType.USER_RESPONSE,
        sourceReference: 'question-revenue-model',
        questionId: 'revenue-model',
        value: 'Subscription revenue',
        capturedAt: FIXED_TIME,
        classification: DiscoveryEvidenceClassification.USER_CONFIRMED,
        consentScope: 'executive-diagnosis',
        confidence: 0.95,
      },
      {
        evidenceId: 'evidence-observed',
        sourceType: DiscoveryEvidenceSourceType.SYSTEM_OBSERVATION,
        sourceReference: 'structured-employee-count',
        fieldId: 'employee-count',
        value: 42,
        capturedAt: FIXED_TIME,
        classification: DiscoveryEvidenceClassification.SYSTEM_OBSERVED,
        consentScope: 'executive-diagnosis',
        confidence: 0.8,
      },
    ],
    consentAssertion: {
      receiptId: 'receipt-001',
      privacyConsent: true,
      diagnosticProcessingConsent: true,
      marketingConsent: false,
      consentVersion: 'privacy-v1',
      capturedAt: FIXED_TIME,
    },
  };
}

function createCapability(
  reasoningProvider: ExecutiveDiscoveryReasoningProvider =
    new DeterministicExecutiveDiscoveryReasoningProvider(),
): ExecutiveDiscoveryCapability {
  return new ExecutiveDiscoveryCapability({
    clock: { now: () => FIXED_TIME },
    idFactory: {
      createId: (scope, seed) => `${scope}:${seed}`,
    },
    reasoningProvider,
  });
}

interface CapturedResponse {
  readonly statusCode: number;
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
}

function createResponse(): { response: Response; captured: () => CapturedResponse } {
  let statusCode = 200;
  let body: unknown;
  const headers: Record<string, string> = {};

  const response = {
    set: (field: string, value: string) => {
      headers[field] = value;
      return response;
    },
    status: (status: number) => {
      statusCode = status;
      return response;
    },
    json: (value: unknown) => {
      body = value;
      return response;
    },
  } as unknown as Response;

  return {
    response,
    captured: () => ({ statusCode, body, headers }),
  };
}

function createHttpRequest(
  body: unknown,
  overrides: Partial<Request> = {},
): Request {
  const contentType = 'application/json; charset=utf-8';
  return {
    method: 'POST',
    body,
    get: createHeaderGetter(contentType, `Bearer ${TEST_TOKEN}`),
    ...overrides,
  } as Request;
}

function createHeaderGetter(
  contentType: string,
  authorization?: string,
): Request['get'] {
  return ((header: string) => {
    if (header.toLowerCase() === 'content-type') return contentType;
    if (header.toLowerCase() === 'authorization') return authorization;
    return undefined;
  }) as Request['get'];
}

async function executeRequest(
  capability: Pick<ExecutiveDiscoveryCapability, 'execute'>,
  request: Request,
  overrides: Partial<{
    identityVerifier: ServiceIdentityVerifier;
    securityLogger: SecurityLogger;
  }> = {},
): Promise<CapturedResponse> {
  const { response, captured } = createResponse();
  await createEvaluateExecutiveDiscoveryV1Handler({
    capability,
    identityVerifier: overrides.identityVerifier ?? identityVerifier,
    authorizationPolicy: new ServiceAuthorizationPolicy(securityConfig),
    securityConfig,
    securityLogger: overrides.securityLogger ?? noOpSecurityLogger,
    clock: securityClock,
  })(request, response);
  return captured();
}

describe('evaluateExecutiveDiscoveryV1 transport', () => {
  it('returns an ExecutiveDiagnosis for a valid POST request', async () => {
    const response = await executeRequest(
      createCapability(),
      createHttpRequest(createValidRequest()),
    );

    expect(response.statusCode).toBe(ExecutiveDiscoveryHttpStatus.OK);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        schemaVersion: '1.0',
        organizationId: 'organization-001',
        generationMetadata: { correlationId: 'correlation-001' },
      },
      meta: { correlationId: 'correlation-001' },
    });
  });

  it('returns a JSON 400 envelope for malformed JSON', async () => {
    let capabilityCalled = false;
    const capability = {
      execute: () => {
        capabilityCalled = true;
        return createCapability().execute(createValidRequest());
      },
    };
    const response = await executeRequest(
      capability,
      createHttpRequest(undefined, { rawBody: Buffer.from('{"broken":') }),
    );

    expect(response.statusCode).toBe(ExecutiveDiscoveryHttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: ExecutiveDiscoveryApiErrorCode.INVALID_JSON,
        message: 'The request body must contain valid JSON.',
      },
    });
    expect(capabilityCalled).toBe(false);
  });

  it('returns 422 when the ExecutiveDiscoveryRequest is invalid', async () => {
    const response = await executeRequest(
      createCapability(),
      createHttpRequest({ ...createValidRequest(), locale: '' }),
    );

    expect(response.statusCode).toBe(
      ExecutiveDiscoveryHttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_DISCOVERY_REQUEST' },
      correlationId: 'correlation-001',
    });
  });

  it('returns a safe 500 envelope when the capability reports an error', async () => {
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'FAILING_PROVIDER',
      providerVersion: '1.0.0',
      reason: () => Promise.reject(new Error('private provider failure')),
    };
    const response = await executeRequest(
      createCapability(provider),
      createHttpRequest(createValidRequest()),
    );

    expect(response.statusCode).toBe(
      ExecutiveDiscoveryHttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.body).toEqual({
      success: false,
      error: {
        code: ExecutiveDiscoveryApiErrorCode.EXECUTIVE_DISCOVERY_FAILED,
        message: 'Executive Discovery could not complete the request.',
      },
      correlationId: 'correlation-001',
    });
    expect(JSON.stringify(response.body)).not.toContain('private provider failure');
  });

  it('returns 500 when the capability rejects an invalid diagnosis', async () => {
    const delegate = new DeterministicExecutiveDiscoveryReasoningProvider();
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'INVALID_DIAGNOSIS_PROVIDER',
      providerVersion: '1.0.0',
      reason: async (request, context): Promise<ExecutiveDiagnosis> => {
        const diagnosis = await delegate.reason(request, context);
        return {
          ...diagnosis,
          maturity: { ...diagnosis.maturity, overallScore: 101 },
        };
      },
    };
    const response = await executeRequest(
      createCapability(provider),
      createHttpRequest(createValidRequest()),
    );

    expect(response.statusCode).toBe(
      ExecutiveDiscoveryHttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.body).toMatchObject({
      success: false,
      error: { code: ExecutiveDiscoveryApiErrorCode.EXECUTIVE_DISCOVERY_FAILED },
      correlationId: 'correlation-001',
    });
  });

  it('returns 401 when Authorization is missing', async () => {
    const capability = { execute: vi.fn(createCapability().execute.bind(createCapability())) };
    const response = await executeRequest(
      capability,
      createHttpRequest(createValidRequest(), {
        get: createHeaderGetter('application/json'),
      }),
    );

    expect(response.statusCode).toBe(ExecutiveDiscoveryHttpStatus.UNAUTHENTICATED);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: ExecutiveDiscoveryApiErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Service authentication is required.',
      },
    });
    expect(capability.execute).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token without leaking verifier details', async () => {
    const response = await executeRequest(
      createCapability(),
      createHttpRequest(createValidRequest(), {
        get: createHeaderGetter(
          'application/json',
          'Bearer private-invalid-token',
        ),
      }),
    );

    expect(response.statusCode).toBe(ExecutiveDiscoveryHttpStatus.UNAUTHENTICATED);
    expect(JSON.stringify(response.body)).not.toContain('private-invalid-token');
    expect(JSON.stringify(response.body)).not.toContain('INVALID_TOKEN');
  });

  it('returns 403 and does not invoke the capability for a manipulated tenant', async () => {
    const capability = { execute: vi.fn(createCapability().execute.bind(createCapability())) };
    const response = await executeRequest(
      capability,
      createHttpRequest({ ...createValidRequest(), tenantId: 'tenant-001-extra' }),
    );

    expect(response.statusCode).toBe(ExecutiveDiscoveryHttpStatus.FORBIDDEN);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: ExecutiveDiscoveryApiErrorCode.ACCESS_FORBIDDEN,
        message: 'The service is not authorized for this request.',
      },
    });
    expect(capability.execute).not.toHaveBeenCalled();
  });

  it('logs only safe security metadata for an authorized request', async () => {
    const log = vi.fn();
    await executeRequest(
      createCapability(),
      createHttpRequest(createValidRequest()),
      { securityLogger: { log } },
    );

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'correlation-001',
        requestId: 'request-001',
        callerSubject: 'control-center-backend',
        tenantId: 'tenant-001',
        organizationId: 'organization-001',
        companyId: 'company-001',
        outcome: SecurityLogOutcome.AUTHORIZED,
      }),
    );
    const serialized = JSON.stringify(log.mock.calls);
    expect(serialized).not.toContain(TEST_TOKEN);
    expect(serialized).not.toContain('Subscription revenue');
    expect(serialized).not.toContain('receipt-001');
  });
});
