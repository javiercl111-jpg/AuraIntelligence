import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  ProductContext,
} from '../types/growthCommercialContext';

import type {
  SolutionMatchingSignal,
} from '../types/solutionMatching';

import {
  AuraLocalCommercialSemanticIntelligence,
} from '../../../services/auraLocalCommercialSemanticIntelligence';

const field = <T>(
  value: T,
) => ({
  value,
  status:
    'confirmed' as const,
  confidence: 100,
  evidenceIds: [],
});

const product =
  (): ProductContext => ({
    id:
      'product:maintenance',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

    name:
      field('Aura Maintenance'),

    category:
      field('Maintenance'),

    description:
      field(
        'Asset maintenance platform',
      ),

    problemsSolved:
      field([
        'Equipment failure',
      ]),

    capabilities:
      field([
        'Preventive maintenance',
      ]),

    benefits:
      field([]),

    differentiators:
      field([]),

    idealCustomerProfiles:
      field([]),

    targetIndustries:
      field([]),

    useCases:
      field([
        'Work order management',
        'Preventive maintenance',
      ]),

    pricingContext: {
      value: null,
      status: 'missing',
      confidence: 0,
      evidenceIds: [],
    },

    commercialEvidence: {
      value: null,
      status: 'missing',
      confidence: 0,
      evidenceIds: [],
    },

    claimsRestrictions:
      field([]),

    preferredMessages: {
      value: null,
      status: 'missing',
      confidence: 0,
      evidenceIds: [],
    },

    websiteUrl: {
      value: null,
      status: 'missing',
      confidence: 0,
      evidenceIds: [],
    },

    evidence: [],

    status:
      'draft',

    completenessScore:
      80,

    version:
      1,

    createdAt:
      '2026-08-19T00:00:00.000Z',

    updatedAt:
      '2026-08-19T00:00:00.000Z',
  });

const signal =
  (): SolutionMatchingSignal => ({
    id:
      'sig:operational-need',

    kind:
      'operational_need',

    value:
      'Necesitamos mantenimiento preventivo y órdenes de trabajo.',

    status:
      'confirmed',

    confidence:
      95,

    sourceAuthority:
      'control_center',

    sourceRef:
      'prospect:operational-need',
  });

describe(
  'Aura local use-case fit integration',
  () => {

    it(
      'maps operational need to use_case_fit when ProductContext useCases support the concept',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [
                signal(),
              ],

              products: [
                product(),
              ],

              requestId:
                'local:use-case-fit',
            });

        expect(result.status)
          .toBe('valid');

        expect(
          result.matches.length,
        ).toBeGreaterThan(0);

        expect(
          result.matches.some(
            item =>
              item.signalId ===
                'sig:operational-need' &&
              item.dimension ===
                'use_case_fit',
          ),
        ).toBe(true);
      },
    );

    it(
      'preserves semantic strength and confidence',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [
                signal(),
              ],

              products: [
                product(),
              ],

              requestId:
                'local:use-case-strength',
            });

        const match =
          result.matches.find(
            item =>
              item.dimension ===
              'use_case_fit',
          );

        expect(match)
          .toBeDefined();

        expect(
          match?.semanticStrength,
        ).toBe(100);

        expect(
          match?.confidence,
        ).toBe(95);
      },
    );
  },
);
