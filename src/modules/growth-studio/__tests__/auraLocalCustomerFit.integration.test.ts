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
  AuraLocalBusinessConceptMapper,
} from '../../../services/auraLocalBusinessConceptMapper';

import {
  AuraLocalConceptAlignmentEngine,
} from '../../../services/auraLocalConceptAlignmentEngine';

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
      'product:hcm',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

    name:
      field('Aura HCM'),

    category:
      field('HCM'),

    description:
      field(
        'Workforce management platform',
      ),

    problemsSolved:
      field([
        'Attendance management',
      ]),

    capabilities:
      field([
        'Employee management',
      ]),

    benefits:
      field([]),

    differentiators:
      field([]),

    idealCustomerProfiles:
      field([
        'Mid-market companies',
      ]),

    targetIndustries:
      field([]),

    useCases:
      field([
        'Attendance management',
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

const companySignal =
  (): SolutionMatchingSignal => ({
    id:
      'sig:company-size',

    kind:
      'company_size',

    value:
      'Somos una empresa mediana.',

    status:
      'confirmed',

    confidence:
      95,

    sourceAuthority:
      'control_center',

    sourceRef:
      'prospect:company-size',
  });

describe(
  'Aura local customer fit integration',
  () => {

    it(
      'maps prospect company segment to MID_MARKET_COMPANY',
      () => {
        const result =
          AuraLocalBusinessConceptMapper.mapSignals(
            [
              companySignal(),
            ],
          );

        expect(
          result.concepts,
        ).toContain(
          'MID_MARKET_COMPANY',
        );
      },
    );

    it(
      'maps ProductContext ICP to MID_MARKET_COMPANY',
      () => {
        const result =
          AuraLocalBusinessConceptMapper.mapProduct(
            product(),
          );

        expect(
          result.concepts,
        ).toContain(
          'MID_MARKET_COMPANY',
        );

        expect(
          result.evidence.some(
            item =>
              item.concept ===
                'MID_MARKET_COMPANY' &&
              item.field ===
                'idealCustomerProfiles',
          ),
        ).toBe(true);
      },
    );

    it(
      'aligns customer segment across prospect and product',
      () => {
        const result =
          AuraLocalConceptAlignmentEngine.align(
            [
              companySignal(),
            ],
            product(),
          );

        const alignment =
          result.alignments.find(
            item =>
              item.concept ===
              'MID_MARKET_COMPANY',
          );

        expect(alignment)
          .toBeDefined();

        expect(
          alignment?.productFields,
        ).toContain(
          'idealCustomerProfiles',
        );

        expect(
          alignment?.confidence,
        ).toBe(95);
      },
    );

    it(
      'produces customer_fit through local semantic intelligence',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [
                companySignal(),
              ],

              products: [
                product(),
              ],

              requestId:
                'local:customer-fit',
            });

        expect(result.status)
          .toBe('valid');

        const match =
          result.matches.find(
            item =>
              item.signalId ===
              'sig:company-size',
          );

        expect(match)
          .toBeDefined();

        expect(
          match?.dimension,
        ).toBe(
          'customer_fit',
        );

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
