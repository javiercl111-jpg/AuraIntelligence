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
  CommercialSolutionDecisionEngine,
} from '../services/CommercialSolutionDecisionEngine';

const portfolio =
  (): ProductPortfolio => ({
    id: 'portfolio:aura',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

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
        id: 'entry:signature',

        productContext: {
          productContextId:
            'product:signature',
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
    ],

    version: 1,

    updatedAt:
      '2026-08-19T00:00:00.000Z',
  });

const signal = (
  id: string,
  kind:
    SolutionMatchingSignal['kind'],
  confidence = 100,
): SolutionMatchingSignal => ({
  id,
  kind,
  value: id,
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
  'CommercialSolutionDecisionEngine',
  () => {

    it(
      'returns a single product when no supported complementary solution exists',
      () => {
        const result =
          CommercialSolutionDecisionEngine.decide({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:people-problem',
                'business_problem',
                95,
              ),

              signal(
                'sig:people-capability',
                'required_capability',
                90,
              ),

              signal(
                'sig:customer',
                'company_size',
                85,
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm:problem',
                'sig:people-problem',
                'product:hcm',
                'problem_fit',
                30,
              ),

              evidence(
                'ev:hcm:capability',
                'sig:people-capability',
                'product:hcm',
                'capability_fit',
                25,
              ),

              evidence(
                'ev:hcm:customer',
                'sig:customer',
                'product:hcm',
                'customer_fit',
                15,
              ),
            ],

            complementaryRelationships: [],

            generatedAt:
              '2026-08-19T03:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe('single_product');

        expect(
          result.primaryProduct
            ?.productContextId,
        ).toBe('product:hcm');

        expect(
          result.bundle,
        ).toBeUndefined();
      },
    );

    it(
      'promotes a single-product recommendation to a bundle only with supported complementary evidence',
      () => {
        const result =
          CommercialSolutionDecisionEngine.decide({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:people-problem',
                'business_problem',
                95,
              ),

              signal(
                'sig:people-capability',
                'required_capability',
                90,
              ),

              signal(
                'sig:customer',
                'company_size',
                85,
              ),

              signal(
                'sig:document-problem',
                'business_problem',
                90,
              ),

              signal(
                'sig:document-interest',
                'declared_interest',
                90,
              ),

              signal(
                'sig:document-customer',
                'company_size',
                85,
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm:problem',
                'sig:people-problem',
                'product:hcm',
                'problem_fit',
                30,
              ),

              evidence(
                'ev:hcm:capability',
                'sig:people-capability',
                'product:hcm',
                'capability_fit',
                25,
              ),

              evidence(
                'ev:hcm:customer',
                'sig:customer',
                'product:hcm',
                'customer_fit',
                15,
              ),

              evidence(
                'ev:signature:problem',
                'sig:document-problem',
                'product:signature',
                'problem_fit',
                30,
              ),

              evidence(
                'ev:signature:interest',
                'sig:document-interest',
                'product:signature',
                'declared_interest',
                10,
              ),

              evidence(
                'ev:signature:customer',
                'sig:document-customer',
                'product:signature',
                'customer_fit',
                15,
              ),

              evidence(
                'ev:relationship',
                'sig:document-problem',
                'product:signature',
                'other',
                0,
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Document governance supports the identified people-operations workflow.',

                evidenceIds: [
                  'ev:relationship',
                ],
              },
            ],

            generatedAt:
              '2026-08-19T03:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe('solution_bundle');

        expect(
          result.primaryProduct
            ?.productContextId,
        ).toBe('product:hcm');

        expect(
          result.bundle?.items,
        ).toHaveLength(2);

        expect(
          result.bundle?.items[1]
            .productContext
            .productContextId,
        ).toBe(
          'product:signature',
        );
      },
    );

    it(
      'preserves more-discovery-required instead of trying to force a bundle',
      () => {
        const result =
          CommercialSolutionDecisionEngine.decide({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:weak-problem',
                'business_problem',
                80,
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm:weak',
                'sig:weak-problem',
                'product:hcm',
                'problem_fit',
                30,
              ),
            ],

            complementaryRelationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Unproven relationship.',

                evidenceIds: [],
              },
            ],

            generatedAt:
              '2026-08-19T03:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe(
          'more_discovery_required',
        );

        expect(
          result.bundle,
        ).toBeUndefined();
      },
    );

    it(
      'preserves no-recommendation when no supported product exists',
      () => {
        const result =
          CommercialSolutionDecisionEngine.decide({
            portfolio:
              portfolio(),

            signals: [],

            evidence: [],

            complementaryRelationships: [],

            generatedAt:
              '2026-08-19T03:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe(
          'no_recommendation',
        );

        expect(
          result.primaryProduct,
        ).toBeUndefined();

        expect(
          result.bundle,
        ).toBeUndefined();
      },
    );

    it(
      'does not bundle two strong products without explicit complementary evidence',
      () => {
        const result =
          CommercialSolutionDecisionEngine.decide({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:hcm-problem',
                'business_problem',
                95,
              ),

              signal(
                'sig:hcm-capability',
                'required_capability',
                90,
              ),

              signal(
                'sig:hcm-customer',
                'company_size',
                85,
              ),

              signal(
                'sig:maintenance-problem',
                'business_problem',
                95,
              ),

              signal(
                'sig:maintenance-capability',
                'required_capability',
                90,
              ),

              signal(
                'sig:maintenance-customer',
                'company_size',
                85,
              ),
            ],

            evidence: [
              evidence(
                'ev:hcm:p',
                'sig:hcm-problem',
                'product:hcm',
                'problem_fit',
                30,
              ),

              evidence(
                'ev:hcm:c',
                'sig:hcm-capability',
                'product:hcm',
                'capability_fit',
                25,
              ),

              evidence(
                'ev:hcm:customer',
                'sig:hcm-customer',
                'product:hcm',
                'customer_fit',
                15,
              ),

              evidence(
                'ev:maintenance:p',
                'sig:maintenance-problem',
                'product:maintenance',
                'problem_fit',
                30,
              ),

              evidence(
                'ev:maintenance:c',
                'sig:maintenance-capability',
                'product:maintenance',
                'capability_fit',
                25,
              ),

              evidence(
                'ev:maintenance:customer',
                'sig:maintenance-customer',
                'product:maintenance',
                'customer_fit',
                15,
              ),
            ],

            complementaryRelationships: [],

            generatedAt:
              '2026-08-19T03:00:00.000Z',
          });

        expect(
          result.decision,
        ).toBe('single_product');

        expect(
          result.bundle,
        ).toBeUndefined();
      },
    );

    it(
      'is deterministic for identical commercial evidence',
      () => {
        const input = {
          portfolio:
            portfolio(),

          signals: [
            signal(
              'sig:problem',
              'business_problem' as const,
              95,
            ),

            signal(
              'sig:capability',
              'required_capability' as const,
              90,
            ),

            signal(
              'sig:customer',
              'company_size' as const,
              85,
            ),
          ],

          evidence: [
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
              'ev:hcm:customer',
              'sig:customer',
              'product:hcm',
              'customer_fit',
              15,
            ),
          ],

          complementaryRelationships: [],

          generatedAt:
            '2026-08-19T03:00:00.000Z',
        };

        const first =
          CommercialSolutionDecisionEngine.decide(
            input,
          );

        const second =
          CommercialSolutionDecisionEngine.decide(
            input,
          );

        expect(second).toEqual(first);
      },
    );
  },
);
