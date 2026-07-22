import { describe, expect, it } from 'vitest';
import { ExecutivePriority } from '../../enums';
import { ExecutiveDiscoveryErrorCode } from '../errors';
import { ExecutiveRiskLikelihood, ExecutiveRiskSeverity } from '../enums';
import { validateExecutiveDiagnosis } from '../validators';
import {
  createTestConfidence,
  createValidDiagnosis,
  createValidRequest,
} from './fixtures/executiveDiscoveryFixtures';

describe('Executive Diagnosis validation', () => {
  it('accepts a valid diagnosis in its request context', () => {
    const request = createValidRequest();
    expect(validateExecutiveDiagnosis(createValidDiagnosis(request), request).success).toBe(true);
  });

  it('rejects maturity and confidence scores outside their ranges', () => {
    const diagnosis = createValidDiagnosis();
    expect(
      validateExecutiveDiagnosis({
        ...diagnosis,
        maturity: { ...diagnosis.maturity, overallScore: 101 },
      }).success,
    ).toBe(false);
    expect(
      validateExecutiveDiagnosis({
        ...diagnosis,
        confidence: { ...diagnosis.confidence, score: -0.01 },
      }).success,
    ).toBe(false);
  });

  it('rejects risks and recommendations without evidence', () => {
    const diagnosis = createValidDiagnosis();
    const invalidRisk = {
      riskId: 'risk-1',
      category: 'operations',
      title: 'Unsupported risk',
      description: 'A risk without evidence.',
      severity: ExecutiveRiskSeverity.HIGH,
      likelihood: ExecutiveRiskLikelihood.UNKNOWN,
      impact: 'Unknown.',
      confidence: createTestConfidence(),
      evidenceIds: [],
    };
    const invalidRecommendation = {
      recommendationId: 'recommendation-1',
      title: 'Unsupported recommendation',
      description: 'A recommendation without evidence.',
      rationale: 'None.',
      priority: ExecutivePriority.LOW,
      confidence: createTestConfidence(),
      evidenceIds: [],
      expectedImpact: 'Unknown.',
      timeframe: 'Unknown.',
      linkedActionIds: [],
    };
    expect(validateExecutiveDiagnosis({ ...diagnosis, risks: [invalidRisk] }).success).toBe(false);
    expect(
      validateExecutiveDiagnosis({ ...diagnosis, recommendations: [invalidRecommendation] })
        .success,
    ).toBe(false);
  });

  it('rejects an invalid generated date', () => {
    expect(
      validateExecutiveDiagnosis(createValidDiagnosis(undefined, { generatedAt: 'tomorrow' }))
        .success,
    ).toBe(false);
  });

  it.each([
    ['tenantId', 'wrong-tenant'],
    ['sessionId', 'wrong-session'],
  ])('rejects a request context mismatch in %s', (field, value) => {
    const request = createValidRequest();
    const result = validateExecutiveDiagnosis(
      { ...createValidDiagnosis(request), [field]: value },
      request,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.INVALID_DIAGNOSIS);
    }
  });

  it('rejects evidence references absent from the request', () => {
    const request = createValidRequest();
    const result = validateExecutiveDiagnosis(
      createValidDiagnosis(request, { evidenceIds: ['unknown-evidence'] }),
      request,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(
        ExecutiveDiscoveryErrorCode.EVIDENCE_REFERENCE_MISMATCH,
      );
    }
  });
});
