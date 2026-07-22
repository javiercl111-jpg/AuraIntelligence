import type {
  ExecutiveConfidence,
  ExecutiveDiagnosis,
  ExecutiveDiscoveryRequest,
} from '../../contracts';
import {
  DiscoveryEvidenceClassification,
  DiscoveryEvidenceSourceType,
  ExecutiveConfidenceLevel,
  ExecutiveDiagnosisStatus,
  ExecutiveMaturityLevel,
} from '../../enums';

export function createTestConfidence(
  overrides: Partial<ExecutiveConfidence> = {},
): ExecutiveConfidence {
  return {
    level: ExecutiveConfidenceLevel.MEDIUM,
    score: 0.55,
    basis: ['Fixture confidence basis.'],
    evidenceCount: 2,
    missingEvidenceCount: 0,
    calibrationVersion: 'test-v1',
    ...overrides,
  };
}

export function createValidRequest(
  overrides: Partial<ExecutiveDiscoveryRequest> = {},
): ExecutiveDiscoveryRequest {
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
    requestedAt: '2026-07-21T18:00:00.000Z',
    evidence: [
      {
        evidenceId: 'evidence-confirmed',
        sourceType: DiscoveryEvidenceSourceType.USER_RESPONSE,
        sourceReference: 'question-revenue-model',
        questionId: 'revenue-model',
        value: 'Subscription revenue',
        capturedAt: '2026-07-21T17:00:00.000Z',
        classification: DiscoveryEvidenceClassification.USER_CONFIRMED,
        consentScope: 'executive-diagnosis',
        confidence: 0.95,
      },
      {
        evidenceId: 'evidence-inferred',
        sourceType: DiscoveryEvidenceSourceType.SYSTEM_OBSERVATION,
        sourceReference: 'structured-employee-count',
        fieldId: 'employee-count',
        value: 42,
        capturedAt: '2026-07-21T17:05:00.000Z',
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
      capturedAt: '2026-07-21T16:55:00.000Z',
    },
    metadata: { channel: 'control-center', attempt: 1 },
    ...overrides,
  };
}

export function createValidDiagnosis(
  request: ExecutiveDiscoveryRequest = createValidRequest(),
  overrides: Partial<ExecutiveDiagnosis> = {},
): ExecutiveDiagnosis {
  const confidence = createTestConfidence();
  return {
    diagnosisId: 'diagnosis-001',
    schemaVersion: '1.0',
    capabilityVersion: request.capabilityVersion,
    organizationId: request.organizationId,
    tenantId: request.tenantId,
    companyId: request.companyId,
    sessionId: request.sessionId,
    status: ExecutiveDiagnosisStatus.PARTIAL,
    executiveSummary: 'A partial summary grounded in the supplied evidence.',
    businessSnapshot: {
      confirmedFacts: [
        {
          label: 'revenue-model',
          value: 'Subscription revenue',
          classification: DiscoveryEvidenceClassification.USER_CONFIRMED,
          evidenceIds: ['evidence-confirmed'],
        },
      ],
      inferredFacts: [],
      systemObservations: [
        {
          label: 'employee-count',
          value: 42,
          classification: DiscoveryEvidenceClassification.SYSTEM_OBSERVED,
          evidenceIds: ['evidence-inferred'],
        },
      ],
      missingInformation: [],
    },
    maturity: {
      overallScore: 0,
      level: ExecutiveMaturityLevel.INITIAL,
      dimensions: [],
      rationale: 'Maturity was not assessed because no explicit measurements were supplied.',
      evidenceIds: [],
      confidence: createTestConfidence({
        level: ExecutiveConfidenceLevel.LOW,
        score: 0,
        evidenceCount: 0,
        basis: ['No explicit maturity measurements were supplied.'],
      }),
    },
    risks: [],
    opportunities: [],
    recommendations: [],
    actions: [],
    confidence,
    evidenceIds: ['evidence-confirmed', 'evidence-inferred'],
    warnings: ['This fixture represents a partial diagnosis.'],
    generatedAt: '2026-07-21T18:00:01.000Z',
    generationMetadata: {
      requestId: request.requestId,
      correlationId: request.correlationId,
      providerId: 'TEST_PROVIDER',
      providerVersion: '1.0.0',
      deterministic: true,
    },
    ...overrides,
  };
}
