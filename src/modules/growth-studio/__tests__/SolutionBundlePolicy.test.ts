import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  ProductSolutionCandidate,
  SolutionMatchEvidence,
} from '../types/solutionMatching';

import {
  SolutionBundlePolicy,
} from '../services/SolutionBundlePolicy';

const candidate = (
  id: string,
  score: number,
  confidence: number,
  recommendationStatus:
    ProductSolutionCandidate['recommendationStatus'],
  evidenceIds: string[],
): ProductSolutionCandidate => ({
  productContext: {
    productContextId: id,
    version: 1,
  },

  score,
  confidence,
  evidenceIds,

  matchedDimensions: [
    'problem_fit',
  ],

  knowledgeGaps: [],

  recommendationStatus,
});

const evidence = (
  id: string,
  productContextId: string,
): SolutionMatchEvidence => ({
  id,
  signalId: `signal:${id}`,
  productContextId,
  dimension: 'problem_fit',
  contribution: 10,
  explanation: id,
});

describe(
  'SolutionBundlePolicy',
  () => {

    it(
      'allows a bundle only when a supporting product has its own evidence and explicit complementary relationship',
      () => {
        const candidates = [
          candidate(
            'product:hcm',
            82,
            90,
            'recommended',
            ['ev:hcm'],
          ),

          candidate(
            'product:signature',
            55,
            80,
            'possible',
            ['ev:signature'],
          ),
        ];

        const result =
          SolutionBundlePolicy.evaluate({
            candidates,

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:signature',
                'product:signature',
              ),
              evidence(
                'ev:relationship',
                'product:signature',
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Document governance complements people operations.',

                evidenceIds: [
                  'ev:relationship',
                ],
              },
            ],

            bundleId:
              'bundle:people-operations',
          });

        expect(result.allowed).toBe(true);

        expect(
          result.bundle?.items,
        ).toHaveLength(2);

        expect(
          result.bundle?.items[0].role,
        ).toBe('primary');

        expect(
          result.bundle?.items[1].role,
        ).toBe('supporting');
      },
    );

    it(
      'does not create a bundle merely because two products have good scores',
      () => {
        const result =
          SolutionBundlePolicy.evaluate({
            candidates: [
              candidate(
                'product:hcm',
                85,
                90,
                'recommended',
                ['ev:hcm'],
              ),

              candidate(
                'product:maintenance',
                75,
                85,
                'recommended',
                ['ev:maintenance'],
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:maintenance',
                'product:maintenance',
              ),
            ],

            complementaryRelationships: [],

            bundleId:
              'bundle:not-supported',
          });

        expect(result.allowed).toBe(false);

        expect(
          result.bundle,
        ).toBeUndefined();
      },
    );

    it(
      'rejects supporting products with insufficient score',
      () => {
        const result =
          SolutionBundlePolicy.evaluate({
            candidates: [
              candidate(
                'product:hcm',
                80,
                90,
                'recommended',
                ['ev:hcm'],
              ),

              candidate(
                'product:signature',
                40,
                90,
                'possible',
                ['ev:signature'],
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:signature',
                'product:signature',
              ),
              evidence(
                'ev:relationship',
                'product:signature',
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Complementary need.',

                evidenceIds: [
                  'ev:relationship',
                ],
              },
            ],

            bundleId:
              'bundle:low-score',
          });

        expect(result.allowed).toBe(false);
      },
    );

    it(
      'rejects supporting products with weak confidence',
      () => {
        const result =
          SolutionBundlePolicy.evaluate({
            candidates: [
              candidate(
                'product:hcm',
                82,
                90,
                'recommended',
                ['ev:hcm'],
              ),

              candidate(
                'product:signature',
                55,
                40,
                'possible',
                ['ev:signature'],
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:signature',
                'product:signature',
              ),
              evidence(
                'ev:relationship',
                'product:signature',
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Complementary need.',

                evidenceIds: [
                  'ev:relationship',
                ],
              },
            ],

            bundleId:
              'bundle:weak-confidence',
          });

        expect(result.allowed).toBe(false);
      },
    );

    it(
      'requires relationship evidence to exist',
      () => {
        const result =
          SolutionBundlePolicy.evaluate({
            candidates: [
              candidate(
                'product:hcm',
                82,
                90,
                'recommended',
                ['ev:hcm'],
              ),

              candidate(
                'product:signature',
                55,
                80,
                'possible',
                ['ev:signature'],
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:signature',
                'product:signature',
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Complementary need.',

                evidenceIds: [
                  'ev:missing-relationship',
                ],
              },
            ],

            bundleId:
              'bundle:no-rel-evidence',
          });

        expect(result.allowed).toBe(false);
      },
    );

    it(
      'caps supporting products at two',
      () => {
        const candidates = [
          candidate(
            'product:hcm',
            85,
            90,
            'recommended',
            ['ev:hcm'],
          ),

          candidate(
            'product:signature',
            60,
            80,
            'possible',
            ['ev:signature'],
          ),

          candidate(
            'product:intelligence',
            58,
            82,
            'possible',
            ['ev:intelligence'],
          ),

          candidate(
            'product:growth',
            56,
            81,
            'possible',
            ['ev:growth'],
          ),
        ];

        const result =
          SolutionBundlePolicy.evaluate({
            candidates,

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:signature',
                'product:signature',
              ),
              evidence(
                'ev:intelligence',
                'product:intelligence',
              ),
              evidence(
                'ev:growth',
                'product:growth',
              ),
              evidence(
                'ev:r1',
                'product:signature',
              ),
              evidence(
                'ev:r2',
                'product:intelligence',
              ),
              evidence(
                'ev:r3',
                'product:growth',
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',
                supportingProductContextId:
                  'product:signature',
                reason:
                  'Complement 1',
                evidenceIds: ['ev:r1'],
              },
              {
                primaryProductContextId:
                  'product:hcm',
                supportingProductContextId:
                  'product:intelligence',
                reason:
                  'Complement 2',
                evidenceIds: ['ev:r2'],
              },
              {
                primaryProductContextId:
                  'product:hcm',
                supportingProductContextId:
                  'product:growth',
                reason:
                  'Complement 3',
                evidenceIds: ['ev:r3'],
              },
            ],

            bundleId:
              'bundle:max-two-supporting',
          });

        expect(result.allowed).toBe(true);

        expect(
          result.bundle?.items,
        ).toHaveLength(3);

        expect(
          result.bundle?.items.filter(
            item =>
              item.role ===
              'supporting',
          ),
        ).toHaveLength(2);
      },
    );

    it(
      'does not inflate bundle score by summing product scores',
      () => {
        const result =
          SolutionBundlePolicy.evaluate({
            candidates: [
              candidate(
                'product:hcm',
                80,
                90,
                'recommended',
                ['ev:hcm'],
              ),

              candidate(
                'product:signature',
                70,
                80,
                'recommended',
                ['ev:signature'],
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm',
                'product:hcm',
              ),
              evidence(
                'ev:signature',
                'product:signature',
              ),
              evidence(
                'ev:relationship',
                'product:signature',
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Complementary supported need.',

                evidenceIds: [
                  'ev:relationship',
                ],
              },
            ],

            bundleId:
              'bundle:controlled-score',
          });

        expect(result.allowed).toBe(true);

        expect(
          result.bundle?.score,
        ).toBe(85);

        expect(
          result.bundle?.score,
        ).toBeLessThan(
          80 + 70,
        );
      },
    );
  },
);
