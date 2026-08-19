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

const field = <T>(value: T) => ({
  value,
  status: 'confirmed' as const,
  confidence: 100,
  evidenceIds: [],
});

const product = (): ProductContext => ({
  id: 'product:test',
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  name: field('Test Product'),
  category: field('Business Software'),

  description: field(
    'Workforce management and business analytics platform',
  ),

  problemsSolved: field([
    'Attendance management',
  ]),

  capabilities: field([
    'Employee management',
    'Executive dashboards',
  ]),

  benefits: field([]),
  differentiators: field([]),
  idealCustomerProfiles: field([]),
  targetIndustries: field([]),

  useCases: field([
    'Time attendance operations',
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

  claimsRestrictions: field([]),

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
  status: 'draft',
  completenessScore: 70,
  version: 1,

  createdAt:
    '2026-08-19T00:00:00.000Z',

  updatedAt:
    '2026-08-19T00:00:00.000Z',
});

const signal = (
  id: string,
  value: string,
): SolutionMatchingSignal => ({
  id,
  kind: 'business_problem',
  value,
  status: 'confirmed',
  confidence: 95,
  sourceAuthority: 'control_center',
  sourceRef: `prospect:${id}`,
});

describe(
  'AuraLocalBusinessConceptMapper',
  () => {

    it(
      'maps Spanish prospect language',
      () => {
        const result =
          AuraLocalBusinessConceptMapper.mapSignals([
            signal(
              'sig:attendance',
              'Tenemos retardos y problemas con el reloj checador.',
            ),
          ]);

        expect(result.concepts)
          .toContain('WORKFORCE_ATTENDANCE');
      },
    );

    it(
      'maps English ProductContext to canonical concepts',
      () => {
        const result =
          AuraLocalBusinessConceptMapper.mapProduct(
            product(),
          );

        expect(result.concepts)
          .toContain('WORKFORCE_ATTENDANCE');

        expect(result.concepts)
          .toContain('WORKFORCE_ADMINISTRATION');

        expect(result.concepts)
          .toContain('BUSINESS_INTELLIGENCE');
      },
    );

    it(
      'preserves product-field evidence',
      () => {
        const result =
          AuraLocalBusinessConceptMapper.mapProduct(
            product(),
          );

        expect(
          result.evidence.some(
            item =>
              item.field === 'problemsSolved',
          ),
        ).toBe(true);

        expect(
          result.evidence.some(
            item =>
              item.field === 'capabilities',
          ),
        ).toBe(true);
      },
    );

    it(
      'returns empty map for unsupported language',
      () => {
        const result =
          AuraLocalBusinessConceptMapper.mapSignals([
            signal(
              'sig:unknown',
              'Necesitamos revisar este asunto.',
            ),
          ]);

        expect(result.concepts).toEqual([]);
        expect(result.evidence).toEqual([]);
      },
    );

    it(
      'keeps prospect and product mapping independent',
      () => {
        const prospect =
          AuraLocalBusinessConceptMapper.mapSignals([
            signal(
              'sig:attendance',
              'Control de asistencia y retardos.',
            ),
          ]);

        const productResult =
          AuraLocalBusinessConceptMapper.mapProduct(
            product(),
          );

        expect(
          prospect.evidence.every(
            item =>
              item.sourceType ===
              'prospect_signal',
          ),
        ).toBe(true);

        expect(
          productResult.evidence.every(
            item =>
              item.sourceType ===
              'product_context',
          ),
        ).toBe(true);
      },
    );
  },
);
