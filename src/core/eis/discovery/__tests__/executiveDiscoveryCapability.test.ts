import { describe, expect, it } from 'vitest';
import type { ExecutiveDiagnosis, ExecutiveDiscoveryRequest } from '../contracts';
import {
  DeterministicExecutiveDiscoveryReasoningProvider,
  ExecutiveDiscoveryCapability,
} from '../capability';
import { ExecutiveDiscoveryErrorCode } from '../errors';
import { ExecutiveDiagnosisStatus } from '../enums';
import type { ExecutiveDiscoveryReasoningProvider } from '../ports';
import { createValidDiagnosis, createValidRequest } from './fixtures/executiveDiscoveryFixtures';

const fixedClock = { now: () => '2026-07-21T18:00:00.000Z' };
const deterministicIds = {
  createId: (scope: string, seed: string) => `${scope}:${seed}`,
};

function createCapability(
  reasoningProvider: ExecutiveDiscoveryReasoningProvider =
    new DeterministicExecutiveDiscoveryReasoningProvider(),
): ExecutiveDiscoveryCapability {
  return new ExecutiveDiscoveryCapability({
    clock: fixedClock,
    idFactory: deterministicIds,
    reasoningProvider,
  });
}

describe('Executive Discovery capability', () => {
  it('returns a validated partial diagnosis for supported evidence', async () => {
    const result = await createCapability().execute(createValidRequest());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.status).toBe(ExecutiveDiagnosisStatus.PARTIAL);
      expect(result.result.risks).toEqual([]);
      expect(result.result.opportunities).toEqual([]);
      expect(result.result.recommendations).toEqual([]);
      expect(result.result.actions).toEqual([]);
      expect(result.result.evidenceIds).toEqual([
        'evidence-confirmed',
        'evidence-inferred',
      ]);
    }
  });

  it('normalizes and redacts before invoking the provider', async () => {
    let receivedRequest: ExecutiveDiscoveryRequest | undefined;
    const deterministicProvider = new DeterministicExecutiveDiscoveryReasoningProvider();
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'CAPTURING_PROVIDER',
      providerVersion: '1.0.0',
      reason: (request, context) => {
        receivedRequest = request;
        return deterministicProvider.reason(request, context);
      },
    };
    const request = createValidRequest({
      locale: 'ES_mx',
      evidence: [
        {
          ...createValidRequest().evidence[0],
          value: 'Contact ceo@example.com',
        },
        createValidRequest().evidence[1],
      ],
    });
    const result = await createCapability(provider).execute(request);
    expect(result.success).toBe(true);
    expect(receivedRequest?.locale).toBe('es-MX');
    expect(JSON.stringify(receivedRequest)).toContain('[REDACTED_EMAIL]');
    expect(result.warnings).toContain(
      'Sensitive patterns were redacted from evidence before reasoning.',
    );
  });

  it('converts a provider failure into a safe typed error', async () => {
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'FAILING_PROVIDER',
      providerVersion: '1.0.0',
      reason: () => Promise.reject(new Error('secret provider detail')),
    };
    const result = await createCapability(provider).execute(createValidRequest());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.REASONING_PROVIDER_FAILURE);
      expect(JSON.stringify(result)).not.toContain('secret provider detail');
    }
  });

  it('rejects an invalid diagnosis returned by a provider', async () => {
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'INVALID_PROVIDER',
      providerVersion: '1.0.0',
      reason: (request) => {
        const diagnosis = createValidDiagnosis(request);
        return Promise.resolve({
          ...diagnosis,
          maturity: { ...diagnosis.maturity, overallScore: 101 },
        });
      },
    };
    const result = await createCapability(provider).execute(createValidRequest());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ExecutiveDiscoveryErrorCode.INVALID_DIAGNOSIS);
    }
  });

  it('rejects a provider diagnosis with unavailable evidence references', async () => {
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'MISMATCH_PROVIDER',
      providerVersion: '1.0.0',
      reason: (request) =>
        Promise.resolve(createValidDiagnosis(request, { evidenceIds: ['unknown-evidence'] })),
    };
    const result = await createCapability(provider).execute(createValidRequest());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(
        ExecutiveDiscoveryErrorCode.EVIDENCE_REFERENCE_MISMATCH,
      );
    }
  });

  it('returns an honest insufficient-evidence diagnosis', async () => {
    const request = createValidRequest({
      evidence: [createValidRequest().evidence[0]],
    });
    const result = await createCapability().execute(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.status).toBe(ExecutiveDiagnosisStatus.INSUFFICIENT_EVIDENCE);
      expect(result.result.warnings).toContain(
        'Evidence is insufficient for supported executive conclusions.',
      );
    }
  });

  it('is exactly deterministic for the same request and injected dependencies', async () => {
    const request = createValidRequest();
    const first = await createCapability().execute(request);
    const second = await createCapability().execute(request);
    expect(second).toEqual(first);
  });

  it('never exposes uncontrolled dependency errors', async () => {
    const capability = new ExecutiveDiscoveryCapability({
      clock: fixedClock,
      idFactory: {
        createId: () => {
          throw new Error('private identifier failure');
        },
      },
      reasoningProvider: new DeterministicExecutiveDiscoveryReasoningProvider(),
    });
    const result = await capability.execute(createValidRequest());
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private identifier failure');
  });

  it('rejects invalid input without calling the provider', async () => {
    let providerCalled = false;
    const provider: ExecutiveDiscoveryReasoningProvider = {
      providerId: 'SPY_PROVIDER',
      providerVersion: '1.0.0',
      reason: () => {
        providerCalled = true;
        return Promise.resolve({} as ExecutiveDiagnosis);
      },
    };
    const result = await createCapability(provider).execute({ correlationId: 'bad-request' });
    expect(result.success).toBe(false);
    expect(providerCalled).toBe(false);
  });
});
