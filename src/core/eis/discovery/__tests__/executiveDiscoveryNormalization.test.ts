import { describe, expect, it } from 'vitest';
import {
  normalizeExecutiveDiscoveryRequest,
  redactDiscoveryEvidence,
} from '../normalization';
import { createValidRequest } from './fixtures/executiveDiscoveryFixtures';

describe('Executive Discovery normalization', () => {
  it('trims transport strings, canonicalizes locale, and sorts evidence stably', () => {
    const request = createValidRequest({
      requestId: '  Request-ABC  ',
      locale: 'ES_mx',
      evidence: [...createValidRequest().evidence].reverse(),
    });
    const normalized = normalizeExecutiveDiscoveryRequest(request);
    expect(normalized.requestId).toBe('Request-ABC');
    expect(normalized.locale).toBe('es-MX');
    expect(normalized.evidence.map((item) => item.evidenceId)).toEqual([
      'evidence-confirmed',
      'evidence-inferred',
    ]);
  });

  it('does not mutate the input or reinterpret evidence payload strings', () => {
    const request = createValidRequest({
      evidence: [
        {
          ...createValidRequest().evidence[0],
          value: '  intentional surrounding whitespace  ',
          metadata: {},
        },
      ],
      metadata: {},
    });
    const before = JSON.stringify(request);
    const normalized = normalizeExecutiveDiscoveryRequest(request);
    expect(JSON.stringify(request)).toBe(before);
    expect(normalized.evidence[0].value).toBe('  intentional surrounding whitespace  ');
    expect(normalized.metadata).toBeUndefined();
    expect(normalized.evidence[0].metadata).toBeUndefined();
  });

  it('redacts common sensitive patterns deterministically', () => {
    const evidence = {
      ...createValidRequest().evidence[0],
      sourceReference: 'https://example.test/path?token=url-secret-123456&safe=yes',
      value:
        'Email ceo@example.com phone +52 55 1234 5678 bearer Bearer abc.def.ghi123 api_key=supersecret123',
      normalizedValue: {
        compactPhone: '5512345678',
        liveKey: 'sk_live_1234567890ABCDEF',
      },
    };
    const first = redactDiscoveryEvidence(evidence);
    const second = redactDiscoveryEvidence(evidence);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toContain('[REDACTED_EMAIL]');
    expect(JSON.stringify(first)).toContain('[REDACTED_PHONE]');
    expect(JSON.stringify(first)).toContain('[REDACTED_BEARER_TOKEN]');
    expect(JSON.stringify(first)).toContain('[REDACTED_API_KEY]');
    expect(first.sourceReference).toContain('token=[REDACTED_TOKEN]');
    expect(JSON.stringify(first)).not.toContain('ceo@example.com');
    expect(JSON.stringify(first)).not.toContain('supersecret123');
  });
});
