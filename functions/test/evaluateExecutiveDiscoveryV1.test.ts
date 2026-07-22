import type { Response } from 'express';
import type { Request } from 'firebase-functions/v2/https';
import { describe, expect, it } from 'vitest';
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
import {
  ExecutiveDiscoveryApiErrorCode,
  ExecutiveDiscoveryHttpStatus,
} from '../src/httpEnvelopes';

const FIXED_TIME = '2026-07-21T18:00:00.000Z';

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
    get: (header: string) =>
      header.toLowerCase() === 'content-type' ? contentType : undefined,
    ...overrides,
  } as Request;
}

async function executeRequest(
  capability: Pick<ExecutiveDiscoveryCapability, 'execute'>,
  request: Request,
): Promise<CapturedResponse> {
  const { response, captured } = createResponse();
  await createEvaluateExecutiveDiscoveryV1Handler(capability)(request, response);
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
});
