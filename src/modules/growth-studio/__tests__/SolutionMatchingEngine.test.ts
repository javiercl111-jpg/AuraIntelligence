import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  ProductPortfolio,
  SolutionMatchEvidence,
  SolutionMatchingSignal,
} from '../types/solutionMatching';

import {
  SolutionMatchingEngine,
} from '../services/SolutionMatchingEngine';

const portfolio =
  (): ProductPortfolio => ({
    id: 'portfolio:aura',
    tenantId: 'tenant-aura',
    companyId: 'company-aura',

    entries: [
      {
        id: 'entry:hcm',
        productContext: {
          productContextId:
            'product:hcm',
          version: 1,
        },
        status: 'active',
        commerciallyRecommendable: true,
      },
      {
        id: 'entry:maintenance',
        productContext: {
          productContextId:
            'product:maintenance',
          version: 1,
        },
        status: 'active',
        commerciallyRecommendable: true,
      },
      {
        id: 'entry:future',
        productContext: {
          productContextId:
            'product:future',
          version: 1,
        },
        status: 'coming_soon',
        commerciallyRecommendable: false,
      },
    ],

    version: 1,
    updatedAt:
      '2026-08-19T00:00:00.000Z',
  });

const signal = (
  id: string,
  kind:
    SolutionMatchingSignal['kind'],
  value: string,
  confidence = 100,
): SolutionMatchingSignal => ({
  id,
  kind,
  value,
  status: 'confirmed',
  confidence,
  sourceAuthority:
    'control_center',
  sourceRef:
    `prospect:${id}`,
});

const evidence = (
  id: string,
  signalId: string,
  productContextId: string,
  dimension:
    SolutionMatchEvidence['dimension'],
  contribution: number,
): SolutionMatchEvidence => ({
  id,
  signalId,
  productContextId,
  dimension,
  contribution,
  explanation: id,
});

describe(
  'SolutionMatchingEngine',
  () => {

    it(
      'selects the strongest supported product across a multi-product portfolio',
      () => {
        const signals = [
          signal(
            'sig:attendance',
            'business_problem',
            'Attendance management',
            95,
          ),
          signal(
            'sig:people',
            'required_capability',
            'Employee management',
            90,
          ),
          signal(
            'sig:midmarket',
            'company_size',
            'Mid-market',
            85,
          ),
        ];

        const result =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),
            signals,

            evidence: [
              evidence(
                'ev:hcm:problem',
                'sig:attendance',
                'product:hcm',
                'problem_fit',
                30,
              ),
              evidence(
                'ev:hcm:capability',
                'sig:people',
                'product:hcm',
                'capability_fit',
                25,
              ),
              evidence(
                'ev:hcm:customer',
                'sig:midmarket',
                'product:hcm',
                'customer_fit',
                15,
              ),

              evidence(
                'ev:maintenance:customer',
                'sig:midmarket',
                'product:maintenance',
                'customer_fit',
                15,
              ),
            ],

            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe('single_product');

        expect(
          result.primaryProduct
            ?.productContextId,
        ).toBe('product:hcm');

        expect(
          result.candidates[0].score,
        ).toBe(70);

        expect(
          result.candidates[0]
            .recommendationStatus,
        ).toBe('recommended');
      },
    );

    it(
      'never evaluates coming-soon or non-recommendable products as commercial candidates',
      () => {
        const result =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),

            signals: [
              signal(
                'sig:future',
                'declared_interest',
                'Future product',
              ),
            ],

            evidence: [
              evidence(
                'ev:future',
                'sig:future',
                'product:future',
                'declared_interest',
                10,
              ),
            ],

            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        expect(
          result.candidates.some(
            candidate =>
              candidate.productContext
                .productContextId ===
              'product:future',
          ),
        ).toBe(false);
      },
    );

    it(
      'returns more-discovery-required when there is meaningful but insufficient evidence',
      () => {
        const result =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),

            signals: [
              signal(
                'sig:problem',
                'business_problem',
                'Operational challenge',
                90,
              ),
              signal(
                'sig:size',
                'company_size',
                'Mid-market',
                90,
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm:problem',
                'sig:problem',
                'product:hcm',
                'problem_fit',
                30,
              ),
              evidence(
                'ev:hcm:customer',
                'sig:size',
                'product:hcm',
                'customer_fit',
                10,
              ),
            ],

            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe(
          'more_discovery_required',
        );

        expect(
          result.primaryProduct,
        ).toBeUndefined();

        expect(
          result.knowledgeGaps.length,
        ).toBeGreaterThan(0);
      },
    );

    it(
      'returns no-recommendation when no supported evidence exists',
      () => {
        const result =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),
            signals: [],
            evidence: [],
            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe('no_recommendation');

        expect(
          result.primaryProduct,
        ).toBeUndefined();
      },
    );

    it(
      'does not allow industry-only evidence to force a recommendation',
      () => {
        const result =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),

            signals: [
              signal(
                'sig:industry',
                'industry',
                'Hospitality',
                100,
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm:industry',
                'sig:industry',
                'product:hcm',
                'industry_fit',
                10,
              ),
            ],

            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe(
          'more_discovery_required',
        );

        expect(
          result.primaryProduct,
        ).toBeUndefined();
      },
    );

    it(
      'ranks candidates deterministically',
      () => {
        const signals = [
          signal(
            'sig:problem',
            'business_problem',
            'Operational problem',
            90,
          ),
          signal(
            'sig:capability',
            'required_capability',
            'Required capability',
            90,
          ),
        ];

        const sharedEvidence = [
          evidence(
            'ev:hcm:p',
            'sig:problem',
            'product:hcm',
            'problem_fit',
            30,
          ),
          evidence(
            'ev:hcm:c',
            'sig:capability',
            'product:hcm',
            'capability_fit',
            25,
          ),
          evidence(
            'ev:maintenance:p',
            'sig:problem',
            'product:maintenance',
            'problem_fit',
            20,
          ),
          evidence(
            'ev:maintenance:c',
            'sig:capability',
            'product:maintenance',
            'capability_fit',
            25,
          ),
        ];

        const first =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),
            signals,
            evidence: sharedEvidence,
            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        const second =
          SolutionMatchingEngine.match({
            portfolio: portfolio(),
            signals,
            evidence: sharedEvidence,
            generatedAt:
              '2026-08-19T02:00:00.000Z',
          });

        expect(
          second.candidates,
        ).toEqual(
          first.candidates,
        );

        expect(
          first.candidates[0]
            .productContext
            .productContextId,
        ).toBe('product:hcm');
      },
    );
  },
);
