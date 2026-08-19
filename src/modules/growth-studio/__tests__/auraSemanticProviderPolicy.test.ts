import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  AuraSemanticProviderPolicy,
} from '../../../services/auraSemanticProviderPolicy';

const eligible = () => ({
  providerId:
    'provider:test',

  structuredOutput:
    true,

  instructionFollowing:
    true,

  semanticReasoning:
    true,

  traceableModel:
    true,

  usageReporting:
    true,

  supportsDataMinimization:
    true,

  maxExpectedLatencyMs:
    5_000,

  costTier:
    'medium' as const,
});

describe(
  'AuraSemanticProviderPolicy',
  () => {

    it(
      'accepts a provider that satisfies mandatory semantic governance requirements',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate(
            eligible(),
          );

        expect(result.eligible)
          .toBe(true);

        expect(
          result.blockingReasons,
        ).toEqual([]);
      },
    );

    it(
      'blocks providers without reliable structured output',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            structuredOutput:
              false,
          });

        expect(result.eligible)
          .toBe(false);

        expect(
          result.blockingReasons.length,
        ).toBeGreaterThan(0);
      },
    );

    it(
      'blocks providers without semantic reasoning capability',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            semanticReasoning:
              false,
          });

        expect(result.eligible)
          .toBe(false);
      },
    );

    it(
      'blocks providers without execution traceability',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            traceableModel:
              false,
          });

        expect(result.eligible)
          .toBe(false);
      },
    );

    it(
      'blocks providers that cannot satisfy data minimization',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            supportsDataMinimization:
              false,
          });

        expect(result.eligible)
          .toBe(false);
      },
    );

    it(
      'warns rather than blocks when usage reporting is absent',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            usageReporting:
              false,
          });

        expect(result.eligible)
          .toBe(true);

        expect(result.warnings.length)
          .toBeGreaterThan(0);
      },
    );

    it(
      'warns when expected latency exceeds the preferred target',
      () => {
        const result =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            maxExpectedLatencyMs:
              30_000,
          });

        expect(result.eligible)
          .toBe(true);

        expect(result.warnings)
          .toContain(
            'Provider expected latency exceeds the preferred semantic-analysis target.',
          );
      },
    );

    it(
      'does not treat provider identity as commercial authority',
      () => {
        const first =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            providerId:
              'provider-a',
          });

        const second =
          AuraSemanticProviderPolicy.evaluate({
            ...eligible(),

            providerId:
              'provider-b',
          });

        expect(first.eligible)
          .toBe(second.eligible);

        expect(
          first.blockingReasons,
        ).toEqual(
          second.blockingReasons,
        );
      },
    );
  },
);
