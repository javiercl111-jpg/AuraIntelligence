import { describe, expect, it } from 'vitest';
import {
  DeterministicExecutiveDiscoveryReasoningProvider,
  ExecutiveDiscoveryCapability,
} from '../capability';
import { createValidDiagnosis, createValidRequest } from './fixtures/executiveDiscoveryFixtures';

function assertJsonOnly(value: unknown, visited = new Set<object>()): void {
  expect(value instanceof Date).toBe(false);
  expect(typeof value).not.toBe('function');
  if (value === null || typeof value !== 'object') return;
  expect(visited.has(value)).toBe(false);
  visited.add(value);
  Object.values(value).forEach((entry) => assertJsonOnly(entry, visited));
  visited.delete(value);
}

describe('Executive Discovery serialization', () => {
  it.each([
    ['request', createValidRequest()],
    ['diagnosis', createValidDiagnosis()],
  ])('round-trips the %s DTO through JSON', (_label, value) => {
    const parsed: unknown = JSON.parse(JSON.stringify(value));
    expect(parsed).toEqual(value);
    assertJsonOnly(value);
  });

  it('returns a JSON-only capability result without circular references', async () => {
    const capability = new ExecutiveDiscoveryCapability({
      clock: { now: () => '2026-07-21T18:00:00.000Z' },
      idFactory: { createId: (scope, seed) => `${scope}:${seed}` },
      reasoningProvider: new DeterministicExecutiveDiscoveryReasoningProvider(),
    });
    const result = await capability.execute(createValidRequest());
    assertJsonOnly(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
