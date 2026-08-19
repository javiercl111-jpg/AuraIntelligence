import { describe, expect, it } from 'vitest';

import type {
  CommercialSolutionRecommendation,
  ProductPortfolio,
  SolutionMatchingSignal,
} from '../types/solutionMatching';

describe(
  'multi-product solution matching contracts',
  () => {

    it(
      'represents a portfolio as references instead of duplicating ProductContext',
      () => {
        const portfolio: ProductPortfolio = {
          id: 'portfolio:aura',
          tenantId: 'tenant-aura',
          companyId: 'company-aura',

          entries: [
            {
              id: 'portfolio-entry:hcm',

              productContext: {
                productContextId:
                  'product:tenant-aura:company-aura:aura-hcm',
                version: 1,
              },

              status: 'active',
              commerciallyRecommendable: true,
            },

            {
              id: 'portfolio-entry:future',

              productContext: {
                productContextId:
                  'product:tenant-aura:company-aura:future-product',
                version: 1,
              },

              status: 'coming_soon',
              commerciallyRecommendable: false,
            },
          ],

          version: 1,
          updatedAt:
            '2026-08-19T00:00:00.000Z',
        };

        expect(portfolio.entries).toHaveLength(2);

        expect(
          JSON.stringify(portfolio),
        ).not.toContain('problemsSolved');
      },
    );

    it(
      'preserves prospect source authority without embedding DENUE',
      () => {
        const signal: SolutionMatchingSignal = {
          id: 'signal:1',
          kind: 'industry',
          value: 'Hospitality',
          status: 'confirmed',
          confidence: 100,
          sourceAuthority: 'control_center',
          sourceRef: 'prospect:123',
        };

        expect(
          signal.sourceAuthority,
        ).toBe('control_center');

        expect(
          JSON.stringify(signal)
            .toLowerCase(),
        ).not.toContain('denue');
      },
    );

    it(
      'supports fail-closed discovery instead of forced product recommendation',
      () => {
        const recommendation:
          CommercialSolutionRecommendation = {
            id: 'recommendation:1',

            tenantId: 'tenant-aura',
            companyId: 'company-aura',

            decision:
              'more_discovery_required',

            candidates: [],

            evidence: [],

            knowledgeGaps: [
              'No supported business problem is known.',
            ],

            confidence: 0,

            generatedAt:
              '2026-08-19T00:00:00.000Z',
          };

        expect(
          recommendation.decision,
        ).toBe(
          'more_discovery_required',
        );

        expect(
          recommendation.primaryProduct,
        ).toBeUndefined();

        expect(
          recommendation.bundle,
        ).toBeUndefined();
      },
    );

    it(
      'supports a multi-product bundle without treating it as a product',
      () => {
        const recommendation:
          CommercialSolutionRecommendation = {
            id: 'recommendation:bundle',

            tenantId: 'tenant-aura',
            companyId: 'company-aura',

            decision:
              'solution_bundle',

            candidates: [],

            bundle: {
              id: 'bundle:people-operations',

              items: [
                {
                  productContext: {
                    productContextId:
                      'product:hcm',
                    version: 1,
                  },

                  role: 'primary',

                  reason:
                    'Primary people-operations fit.',
                },

                {
                  productContext: {
                    productContextId:
                      'product:signature',
                    version: 1,
                  },

                  role: 'supporting',

                  reason:
                    'Supports governed document workflows.',
                },
              ],

              score: 82,
              confidence: 78,

              rationale:
                'Combined capabilities address distinct supported needs.',

              evidenceIds: [
                'match:hcm',
                'match:signature',
              ],
            },

            evidence: [],

            knowledgeGaps: [],

            confidence: 78,

            generatedAt:
              '2026-08-19T00:00:00.000Z',
          };

        expect(
          recommendation.bundle?.items,
        ).toHaveLength(2);

        expect(
          recommendation.bundle
            ?.items[0].role,
        ).toBe('primary');

        expect(
          recommendation.bundle
            ?.items[1].role,
        ).toBe('supporting');
      },
    );
  },
);
