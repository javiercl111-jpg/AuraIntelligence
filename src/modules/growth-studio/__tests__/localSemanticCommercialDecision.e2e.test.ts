import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  ProductContext,
} from '../types/growthCommercialContext';

import type {
  ProductPortfolio,
  SolutionMatchingSignal,
} from '../types/solutionMatching';

import {
  AuraLocalCommercialSemanticIntelligence,
} from '../../../services/auraLocalCommercialSemanticIntelligence';

import {
  CommercialSemanticMatchingOrchestrator,
} from '../services/CommercialSemanticMatchingOrchestrator';

const field = <T>(
  value: T,
) => ({
  value,
  status:
    'confirmed' as const,
  confidence: 100,
  evidenceIds: [],
});

const hcm =
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
        'Workforce management and attendance management platform',
      ),

    problemsSolved:
      field([
        'Attendance management',
        'Employee administration',
      ]),

    capabilities:
      field([
        'Employee management',
        'Time attendance',
      ]),

    benefits:
      field([
        'Operational visibility',
      ]),

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
        'Employee management',
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
      field([
        'Do not guarantee outcomes',
      ]),

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

const portfolio =
  (): ProductPortfolio => ({
    id:
      'portfolio:aura',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

    entries: [
      {
        id:
          'entry:hcm',

        productContext: {
          productContextId:
            'product:hcm',

          version: 1,
        },

        status:
          'active',

        commerciallyRecommendable:
          true,
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
  'Local semantic commercial decision E2E',
  () => {

    it(
      'asks for more discovery when only one supported business problem is known',
      async () => {
        const orchestrator =
          new CommercialSemanticMatchingOrchestrator(
            new AuraLocalCommercialSemanticIntelligence(),
          );

        const result =
          await orchestrator.execute({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:attendance-problem',
                'business_problem',
                'Tenemos muchos retardos y problemas con el reloj checador.',
              ),
            ],

            products: [
              hcm(),
            ],

            complementaryRelationships:
              [],

            requestId:
              'local:e2e:discovery',

            generatedAt:
              '2026-08-19T05:00:00.000Z',
          });

        expect(
          result.semanticStatus,
        ).toBe('valid');

        expect(
          result.acceptedEvidenceCount,
        ).toBeGreaterThan(0);

        expect(
          result.recommendation
            .decision,
        ).toBe(
          'more_discovery_required',
        );
      },
    );

    it(
      'recommends the supported product when local evidence satisfies the commercial policy',
      async () => {
        const orchestrator =
          new CommercialSemanticMatchingOrchestrator(
            new AuraLocalCommercialSemanticIntelligence(),
          );

        const result =
          await orchestrator.execute({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:attendance-problem',
                'business_problem',
                'Tenemos problemas de asistencia, retardos y reloj checador.',
              ),

              signal(
                'sig:people-capability',
                'required_capability',
                'Necesitamos gestión de personal y administración de empleados.',
              ),

              signal(
                'sig:attendance-interest',
                'declared_interest',
                'Nos interesa mejorar el control de asistencia.',
              ),

              signal(
                'sig:company-size',
                'company_size',
                'Somos una empresa mediana.',
              ),
            ],

            products: [
              hcm(),
            ],

            complementaryRelationships:
              [],

            requestId:
              'local:e2e:recommend',

            generatedAt:
              '2026-08-19T05:00:00.000Z',
          });

        expect(
          result.semanticStatus,
        ).toBe('valid');

        expect(
          result.acceptedEvidenceCount,
        ).toBeGreaterThanOrEqual(3);

        expect(
          result.recommendation
            .decision,
        ).toBe(
          'single_product',
        );

        expect(
          result.recommendation
            .primaryProduct
            ?.productContextId,
        ).toBe(
          'product:hcm',
        );
      },
    );

    it(
      'does not recommend a product for unsupported business language',
      async () => {
        const orchestrator =
          new CommercialSemanticMatchingOrchestrator(
            new AuraLocalCommercialSemanticIntelligence(),
          );

        const result =
          await orchestrator.execute({
            portfolio:
              portfolio(),

            signals: [
              signal(
                'sig:unknown',
                'business_problem',
                'Necesitamos revisar este asunto.',
              ),
            ],

            products: [
              hcm(),
            ],

            complementaryRelationships:
              [],

            requestId:
              'local:e2e:none',

            generatedAt:
              '2026-08-19T05:00:00.000Z',
          });

        expect(
          result.acceptedEvidenceCount,
        ).toBe(0);

        expect(
          result.recommendation
            .decision,
        ).toBe(
          'no_recommendation',
        );
      },
    );

    it(
      'uses only the local semantic authority',
      async () => {
        const intelligence =
          new AuraLocalCommercialSemanticIntelligence();

        expect(
          await intelligence.isAvailable(),
        ).toBe(true);

        const semantic =
          await intelligence.analyze({
            tenantId:
              'tenant-aura',

            companyId:
              'company-aura',

            signals: [
              signal(
                'sig:attendance',
                'business_problem',
                'Control de asistencia.',
              ),
            ],

            products: [
              hcm(),
            ],

            requestId:
              'local:e2e:authority',
          });

        expect(
          semantic.trace.provider,
        ).toBe(
          'aura_local',
        );

        expect(
          semantic.trace.model,
        ).toBe(
          'local-concept-alignment-v1',
        );
      },
    );
  },
);
