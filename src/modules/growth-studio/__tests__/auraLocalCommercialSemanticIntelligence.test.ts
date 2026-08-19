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
      'product:hcm',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

    name:
      field('Product'),

    category:
      field('Business Software'),

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
      field([]),

    targetIndustries:
      field([]),

    useCases:
      field([
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
      70,

    version:
      1,

    createdAt:
      '2026-08-19T00:00:00.000Z',

    updatedAt:
      '2026-08-19T00:00:00.000Z',
  });

const signal = (
  id: string,
  kind:
    SolutionMatchingSignal['kind'],
  value: string,
  confidence = 95,
): SolutionMatchingSignal => ({
  id,
  kind,
  value,
  status:
    'confirmed',
  confidence,
  sourceAuthority:
    'control_center',
  sourceRef:
    `prospect:${id}`,
});

describe(
  'AuraLocalCommercialSemanticIntelligence',
  () => {

    it(
      'produces local semantic problem-fit matches without external AI',
      async () => {
        const intelligence =
          new AuraLocalCommercialSemanticIntelligence();

        const result =
          await intelligence.analyze({
            tenantId:
              'tenant-aura',

            companyId:
              'company-aura',

            signals: [
              signal(
                'sig:attendance',
                'business_problem',
                'Tenemos problemas de asistencia y retardos.',
              ),
            ],

            products: [
              product(),
            ],

            requestId:
              'local:req:1',
          });

        expect(result.status)
          .toBe('valid');

        expect(result.matches)
          .toHaveLength(1);

        expect(
          result.matches[0]
            .dimension,
        ).toBe(
          'problem_fit',
        );

        expect(
          result.matches[0]
            .semanticStrength,
        ).toBe(100);

        expect(
          result.trace.provider,
        ).toBe(
          'aura_local',
        );
      },
    );

    it(
      'maps capability signals only when supported by product capabilities',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [
                signal(
                  'sig:people',
                  'required_capability',
                  'Necesitamos gestión de personal.',
                ),
              ],

              products: [
                product(),
              ],

              requestId:
                'local:req:capability',
            });

        expect(
          result.matches[0]
            .dimension,
        ).toBe(
          'capability_fit',
        );
      },
    );

    it(
      'fails closed to other when concept alignment exists but dimension evidence is not authoritative',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [
                signal(
                  'sig:attendance',
                  'required_capability',
                  'Control de asistencia.',
                ),
              ],

              products: [
                product(),
              ],

              requestId:
                'local:req:other',
            });

        expect(
          result.matches[0]
            .dimension,
        ).toBe(
          'other',
        );
      },
    );

    it(
      'returns valid zero-match analysis for unsupported business meaning',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [
                signal(
                  'sig:unknown',
                  'business_problem',
                  'Necesitamos revisar este asunto.',
                ),
              ],

              products: [
                product(),
              ],

              requestId:
                'local:req:none',
            });

        expect(result.status)
          .toBe('valid');

        expect(result.matches)
          .toEqual([]);

        expect(
          result.knowledgeGaps.length,
        ).toBeGreaterThan(0);
      },
    );

    it(
      'returns insufficient context when signals are missing',
      async () => {
        const result =
          await new AuraLocalCommercialSemanticIntelligence()
            .analyze({
              tenantId:
                'tenant-aura',

              companyId:
                'company-aura',

              signals: [],

              products: [
                product(),
              ],

              requestId:
                'local:req:insufficient',
            });

        expect(result.status)
          .toBe(
            'insufficient_context',
          );

        expect(result.matches)
          .toEqual([]);
      },
    );

    it(
      'is always locally available and performs no provider selection',
      async () => {
        const intelligence =
          new AuraLocalCommercialSemanticIntelligence();

        expect(
          await intelligence.isAvailable(),
        ).toBe(true);
      },
    );
  },
);
