import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  CommercialSemanticAnalysisResult,
} from '../services/contracts/ICommercialSemanticIntelligence';

import {
  CommercialSemanticEvidencePolicy,
} from '../services/CommercialSemanticEvidencePolicy';

const result = (
  overrides:
    Partial<CommercialSemanticAnalysisResult> = {},
): CommercialSemanticAnalysisResult => ({
  status: 'valid',

  matches: [],

  knowledgeGaps: [],

  trace: {
    requestId:
      'semantic:req:policy',
  },

  ...overrides,
});

describe(
  'CommercialSemanticEvidencePolicy',
  () => {

    it(
      'maps high-confidence strong semantic problem fit to the dimension maximum',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              matches: [
                {
                  signalId:
                    'sig:problem',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'problem_fit',

                  semanticStrength:
                    92,

                  confidence:
                    88,

                  explanation:
                    'Strong supported problem alignment.',
                },
              ],
            }),
          );

        expect(
          output.evidence,
        ).toHaveLength(1);

        expect(
          output.evidence[0]
            .contribution,
        ).toBe(30);
      },
    );

    it(
      'maps medium semantic strength to seventy-five percent of the dimension maximum',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              matches: [
                {
                  signalId:
                    'sig:problem',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'problem_fit',

                  semanticStrength:
                    78,

                  confidence:
                    85,

                  explanation:
                    'Supported alignment.',
                },
              ],
            }),
          );

        expect(
          output.evidence[0]
            .contribution,
        ).toBe(23);
      },
    );

    it(
      'maps minimum accepted strength to half of the dimension maximum',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              matches: [
                {
                  signalId:
                    'sig:capability',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'capability_fit',

                  semanticStrength:
                    60,

                  confidence:
                    80,

                  explanation:
                    'Moderate supported capability alignment.',
                },
              ],
            }),
          );

        expect(
          output.evidence[0]
            .contribution,
        ).toBe(13);
      },
    );

    it(
      'rejects high semantic strength when semantic confidence is weak',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              matches: [
                {
                  signalId:
                    'sig:problem',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'problem_fit',

                  semanticStrength:
                    95,

                  confidence:
                    42,

                  explanation:
                    'Uncertain interpretation.',
                },
              ],
            }),
          );

        expect(
          output.evidence,
        ).toEqual([]);

        expect(
          output.rejectedMatches,
        ).toHaveLength(1);
      },
    );

    it(
      'rejects semantic strength below the evidence threshold',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              matches: [
                {
                  signalId:
                    'sig:industry',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'industry_fit',

                  semanticStrength:
                    55,

                  confidence:
                    95,

                  explanation:
                    'Weak industry relationship.',
                },
              ],
            }),
          );

        expect(
          output.evidence,
        ).toEqual([]);

        expect(
          output.rejectedMatches,
        ).toHaveLength(1);
      },
    );

    it(
      'fails closed for invalid semantic analysis',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              status:
                'invalid_response',

              matches: [
                {
                  signalId:
                    'sig:problem',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'problem_fit',

                  semanticStrength:
                    100,

                  confidence:
                    100,

                  explanation:
                    'Must not survive invalid analysis.',
                },
              ],

              knowledgeGaps: [
                'Semantic response failed validation.',
              ],
            }),
          );

        expect(
          output.evidence,
        ).toEqual([]);

        expect(
          output.knowledgeGaps,
        ).toContain(
          'Semantic response failed validation.',
        );
      },
    );

    it(
      'does not convert an unsupported other dimension into scoring evidence',
      () => {
        const output =
          CommercialSemanticEvidencePolicy.evaluate(
            result({
              matches: [
                {
                  signalId:
                    'sig:other',

                  productContextId:
                    'product:hcm',

                  dimension:
                    'other',

                  semanticStrength:
                    100,

                  confidence:
                    100,

                  explanation:
                    'Non-scoring semantic observation.',
                },
              ],
            }),
          );

        expect(
          output.evidence,
        ).toEqual([]);

        expect(
          output.rejectedMatches,
        ).toHaveLength(1);
      },
    );
  },
);
