import { describe, expect, it } from 'vitest';
import { ExecutiveDiscoveryErrorCode } from '../errors';
import { validateExecutiveDiscoveryRequest } from '../validators';
import { createValidRequest } from './fixtures/executiveDiscoveryFixtures';

function withoutProperty(
  value: object,
  property: string,
): Readonly<Record<string, unknown>> {
  const clone = { ...value } as Record<string, unknown>;
  delete clone[property];
  return clone;
}

describe('Executive Discovery request validation', () => {
  it('accepts a valid request', () => {
    expect(validateExecutiveDiscoveryRequest(createValidRequest()).success).toBe(true);
  });

  it.each(['tenantId', 'consentAssertion'])(
    'rejects a request missing %s',
    (property) => {
      const input = withoutProperty(createValidRequest(), property);
      const result = validateExecutiveDiscoveryRequest(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_REQUEST);
      }
    },
  );

  it('rejects empty evidence', () => {
    const result = validateExecutiveDiscoveryRequest(createValidRequest({ evidence: [] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_EVIDENCE);
    }
  });

  it('rejects invalid dates', () => {
    const result = validateExecutiveDiscoveryRequest(
      createValidRequest({ requestedAt: '21/07/2026' }),
    );
    expect(result.success).toBe(false);
  });

  it.each(['maturityScore', 'diagnosis', 'recommendations', 'briefing', 'risks'])(
    'rejects client conclusion field %s',
    (field) => {
      const input: Record<string, unknown> = { ...createValidRequest(), [field]: 'forbidden' };
      expect(validateExecutiveDiscoveryRequest(input).success).toBe(false);
    },
  );

  it('returns a stable error for an unsupported schema version', () => {
    const result = validateExecutiveDiscoveryRequest({
      ...createValidRequest(),
      schemaVersion: '2.0',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.UNSUPPORTED_SCHEMA_VERSION);
    }
  });

  it('rejects whitespace-only identifiers', () => {
    expect(
      validateExecutiveDiscoveryRequest(createValidRequest({ tenantId: '   ' })).success,
    ).toBe(false);
  });

  it.each([
    ['sourceType', 'INVALID_SOURCE'],
    ['classification', 'INVALID_CLASSIFICATION'],
    ['confidence', 1.1],
    ['metadata', { nested: { secret: true } }],
  ])('rejects malformed evidence %s', (field, invalidValue) => {
    const request = createValidRequest();
    const evidence = [{ ...request.evidence[0], [field]: invalidValue }];
    const result = validateExecutiveDiscoveryRequest(createValidRequest({ evidence }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_EVIDENCE);
    }
  });

  it('rejects consent assertions that do not permit diagnostic processing', () => {
    const request = createValidRequest();
    const result = validateExecutiveDiscoveryRequest({
      ...request,
      consentAssertion: {
        ...request.consentAssertion,
        diagnosticProcessingConsent: false,
      },
    });
    expect(result.success).toBe(false);
  });
});
