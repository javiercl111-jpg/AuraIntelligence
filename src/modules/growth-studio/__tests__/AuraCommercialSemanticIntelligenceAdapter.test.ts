import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  IAuraSemanticCompletionPort,
} from '../services/contracts/IAuraSemanticCompletionPort';

import {
  AuraCommercialSemanticIntelligenceAdapter,
} from '../services/AuraCommercialSemanticIntelligenceAdapter';

const request = {
  tenantId: 'tenant-aura',
  companyId: 'company-aura',
  signals: [],
  products: [],
  requestId: 'semantic:req:adapter',
};

describe(
  'AuraCommercialSemanticIntelligenceAdapter',
  () => {

    it(
      'validates structured semantic output',
      async () => {
        const port:
          IAuraSemanticCompletionPort = {
            async isAvailable() {
              return true;
            },

            async complete() {
              return {
                content:
                  JSON.stringify({
                    matches: [
                      {
                        signalId:
                          'sig:problem',

                        productContextId:
                          'product:hcm',

                        dimension:
                          'problem_fit',

                        semanticStrength:
                          94,

                        confidence:
                          88,

                        explanation:
                          'Supported semantic alignment.',
                      },
                    ],

                    knowledgeGaps: [],
                  }),

                provider:
                  'fake-core',

                model:
                  'fake-model',

                durationMs:
                  100,

                tokenUsage:
                  250,
              };
            },
          };

        const result =
          await new AuraCommercialSemanticIntelligenceAdapter(
            port,
          ).analyze(request);

        expect(result.status)
          .toBe('valid');

        expect(result.matches)
          .toHaveLength(1);

        expect(result.matches[0]
          .semanticStrength)
          .toBe(94);

        expect(result.trace.provider)
          .toBe('fake-core');
      },
    );

    it(
      'fails closed for malformed JSON',
      async () => {
        const port:
          IAuraSemanticCompletionPort = {
            async isAvailable() {
              return true;
            },

            async complete() {
              return {
                content:
                  'not-json',
              };
            },
          };

        const result =
          await new AuraCommercialSemanticIntelligenceAdapter(
            port,
          ).analyze(request);

        expect(result.status)
          .toBe(
            'invalid_response',
          );

        expect(result.matches)
          .toEqual([]);
      },
    );

    it(
      'rejects unsupported dimensions',
      async () => {
        const port:
          IAuraSemanticCompletionPort = {
            async isAvailable() {
              return true;
            },

            async complete() {
              return {
                content:
                  JSON.stringify({
                    matches: [
                      {
                        signalId:
                          'sig:x',

                        productContextId:
                          'product:hcm',

                        dimension:
                          'invented_fit',

                        semanticStrength:
                          100,

                        confidence:
                          100,

                        explanation:
                          'Must fail.',
                      },
                    ],

                    knowledgeGaps: [],
                  }),
              };
            },
          };

        const result =
          await new AuraCommercialSemanticIntelligenceAdapter(
            port,
          ).analyze(request);

        expect(result.status)
          .toBe(
            'invalid_response',
          );

        expect(result.matches)
          .toEqual([]);
      },
    );

    it(
      'rejects semantic values outside 0-100',
      async () => {
        const port:
          IAuraSemanticCompletionPort = {
            async isAvailable() {
              return true;
            },

            async complete() {
              return {
                content:
                  JSON.stringify({
                    matches: [
                      {
                        signalId:
                          'sig:x',

                        productContextId:
                          'product:hcm',

                        dimension:
                          'problem_fit',

                        semanticStrength:
                          140,

                        confidence:
                          90,

                        explanation:
                          'Invalid range.',
                      },
                    ],

                    knowledgeGaps: [],
                  }),
              };
            },
          };

        const result =
          await new AuraCommercialSemanticIntelligenceAdapter(
            port,
          ).analyze(request);

        expect(result.status)
          .toBe(
            'invalid_response',
          );
      },
    );

    it(
      'fails closed when completion is unavailable',
      async () => {
        const port:
          IAuraSemanticCompletionPort = {
            async isAvailable() {
              return false;
            },

            async complete() {
              throw new Error(
                'must not execute',
              );
            },
          };

        const adapter =
          new AuraCommercialSemanticIntelligenceAdapter(
            port,
          );

        expect(
          await adapter.isAvailable(),
        ).toBe(false);

        const result =
          await adapter.analyze(
            request,
          );

        expect(result.status)
          .toBe(
            'provider_unavailable',
          );
      },
    );

    it(
      'does not expose commercial contribution in the semantic request contract',
      async () => {
        let payload = '';

        const port:
          IAuraSemanticCompletionPort = {
            async isAvailable() {
              return true;
            },

            async complete(req) {
              payload =
                req.userPayload;

              return {
                content:
                  JSON.stringify({
                    matches: [],
                    knowledgeGaps: [],
                  }),
              };
            },
          };

        await new AuraCommercialSemanticIntelligenceAdapter(
          port,
        ).analyze(request);

        expect(payload)
          .not.toContain(
            '"contribution"',
          );

        expect(payload)
          .not.toContain(
            '"score"',
          );
      },
    );
  },
);
