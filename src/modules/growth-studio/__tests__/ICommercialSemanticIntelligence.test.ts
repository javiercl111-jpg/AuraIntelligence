import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  CommercialSemanticAnalysisResult,
  ICommercialSemanticIntelligence,
} from '../services/contracts/ICommercialSemanticIntelligence';

describe(
  'ICommercialSemanticIntelligence contract',
  () => {

    it(
      'keeps semantic strength separate from final matching contribution',
      async () => {
        const provider:
          ICommercialSemanticIntelligence = {
            async analyze() {
              return {
                status: 'valid',

                matches: [
                  {
                    signalId:
                      'signal:problem',

                    productContextId:
                      'product:hcm',

                    dimension:
                      'problem_fit',

                    semanticStrength:
                      92,

                    confidence:
                      88,

                    explanation:
                      'The prospect problem aligns with a documented product problem.',
                  },
                ],

                knowledgeGaps: [],

                trace: {
                  requestId:
                    'semantic:req:1',

                  provider:
                    'opaque-provider',

                  model:
                    'opaque-model',
                },
              };
            },

            async isAvailable() {
              return true;
            },
          };

        const result =
          await provider.analyze({
            tenantId:
              'tenant-aura',

            companyId:
              'company-aura',

            signals: [],

            products: [],

            requestId:
              'semantic:req:1',
          });

        expect(
          result.matches[0]
            .semanticStrength,
        ).toBe(92);

        expect(
          JSON.stringify(
            result.matches[0],
          ),
        ).not.toContain(
          '"contribution"',
        );
      },
    );

    it(
      'supports fail-closed invalid responses with zero matches',
      () => {
        const result:
          CommercialSemanticAnalysisResult = {
            status:
              'invalid_response',

            matches: [],

            knowledgeGaps: [
              'Semantic output could not be validated.',
            ],

            trace: {
              requestId:
                'semantic:req:invalid',
            },
          };

        expect(
          result.matches,
        ).toEqual([]);

        expect(
          result.status,
        ).toBe(
          'invalid_response',
        );
      },
    );

    it(
      'supports insufficient context without inventing evidence',
      () => {
        const result:
          CommercialSemanticAnalysisResult = {
            status:
              'insufficient_context',

            matches: [],

            knowledgeGaps: [
              'No supported business problem is known.',
            ],

            trace: {
              requestId:
                'semantic:req:insufficient',
            },
          };

        expect(
          result.matches,
        ).toHaveLength(0);
      },
    );

    it(
      'keeps provider metadata as trace information rather than commercial evidence',
      () => {
        const result:
          CommercialSemanticAnalysisResult = {
            status: 'valid',

            matches: [],

            knowledgeGaps: [],

            trace: {
              requestId:
                'semantic:req:trace',

              provider:
                'provider-x',

              model:
                'model-y',

              durationMs: 125,

              tokenUsage: 450,
            },
          };

        expect(
          result.trace.provider,
        ).toBe('provider-x');

        expect(
          result.matches,
        ).toEqual([]);
      },
    );
  },
);
