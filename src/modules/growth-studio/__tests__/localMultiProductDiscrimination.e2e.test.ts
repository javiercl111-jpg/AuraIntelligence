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

const field = <T>(value: T) => ({
  value,
  status: 'confirmed' as const,
  confidence: 100,
  evidenceIds: [],
});

const product = (
  id: string,
  name: string,
  category: string,
  description: string,
  problemsSolved: string[],
  capabilities: string[],
  useCases: string[],
): ProductContext => ({
  id,
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  name: field(name),
  category: field(category),
  description: field(description),

  problemsSolved:
    field(problemsSolved),

  capabilities:
    field(capabilities),

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
    field(useCases),

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
  status: 'draft',
  completenessScore: 80,
  version: 1,

  createdAt:
    '2026-08-19T00:00:00.000Z',

  updatedAt:
    '2026-08-19T00:00:00.000Z',
});

const hcm = () =>
  product(
    'product:hcm',
    'Aura HCM',
    'HCM',
    'Workforce management and attendance platform',
    [
      'Attendance management',
      'Employee administration',
    ],
    [
      'Employee management',
      'Time attendance',
    ],
    [
      'Attendance management',
      'Employee management',
    ],
  );

const maintenance = () =>
  product(
    'product:maintenance',
    'Aura Maintenance',
    'Maintenance',
    'Asset maintenance and work order platform',
    [
      'Equipment failure',
      'Asset maintenance',
    ],
    [
      'Preventive maintenance',
      'Work order management',
    ],
    [
      'Preventive maintenance',
      'Work order management',
    ],
  );

const signature = () =>
  product(
    'product:signature',
    'Aura Signature',
    'Signature',
    'Electronic signature and document governance platform',
    [
      'Document approval',
      'Document traceability',
    ],
    [
      'Electronic signature',
      'Digital signature',
    ],
    [
      'Document signature',
      'Document approval',
    ],
  );

const products = () => [
  hcm(),
  maintenance(),
  signature(),
];

const portfolio =
  (): ProductPortfolio => ({
    id:
      'portfolio:aura',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

    entries: [
      'hcm',
      'maintenance',
      'signature',
    ].map(
      id => ({
        id:
          `entry:${id}`,

        productContext: {
          productContextId:
            `product:${id}`,

          version: 1,
        },

        status:
          'active' as const,

        commerciallyRecommendable:
          true,
      }),
    ),

    version: 1,

    updatedAt:
      '2026-08-19T00:00:00.000Z',
  });

const signal = (
  id: string,
  kind: SolutionMatchingSignal['kind'],
  value: string,
): SolutionMatchingSignal => ({
  id,
  kind,
  value,
  status: 'confirmed',
  confidence: 95,
  sourceAuthority: 'control_center',
  sourceRef: `prospect:${id}`,
});

const commonCompanySignal = () =>
  signal(
    'sig:company',
    'company_size',
    'Somos una empresa mediana.',
  );

const execute = async (
  signals: SolutionMatchingSignal[],
) =>
  new CommercialSemanticMatchingOrchestrator(
    new AuraLocalCommercialSemanticIntelligence(),
  ).execute({
    portfolio:
      portfolio(),

    signals,

    products:
      products(),

    complementaryRelationships:
      [],

    requestId:
      `multi:${signals[0]?.id}`,

    generatedAt:
      '2026-08-19T06:00:00.000Z',
  });

describe(
  'Local multi-product discrimination E2E',
  () => {

    it(
      'selects Aura HCM for workforce attendance needs',
      async () => {
        const result =
          await execute([
            signal(
              'hcm:problem',
              'business_problem',
              'Tenemos problemas de asistencia, retardos y reloj checador.',
            ),

            signal(
              'hcm:capability',
              'required_capability',
              'Necesitamos gestión de personal y control de asistencia.',
            ),

            signal(
              'hcm:operation',
              'operational_need',
              'Necesitamos mejorar la operación de asistencia y administración de empleados.',
            ),

            signal(
              'hcm:interest',
              'declared_interest',
              'Nos interesa mejorar el control de asistencia.',
            ),

            commonCompanySignal(),
          ]);

        expect(
          result.recommendation.decision,
        ).toBe('single_product');

        expect(
          result.recommendation
            .primaryProduct
            ?.productContextId,
        ).toBe('product:hcm');
      },
    );

    it(
      'selects Aura Maintenance for asset maintenance needs',
      async () => {
        const result =
          await execute([
            signal(
              'maintenance:problem',
              'business_problem',
              'Tenemos fallas recurrentes, equipos detenidos y máquinas paradas.',
            ),

            signal(
              'maintenance:capability',
              'required_capability',
              'Necesitamos mantenimiento preventivo y gestión de órdenes de trabajo.',
            ),

            signal(
              'maintenance:operation',
              'operational_need',
              'Necesitamos mantenimiento preventivo y órdenes de trabajo.',
            ),

            signal(
              'maintenance:interest',
              'declared_interest',
              'Nos interesa mejorar el mantenimiento de activos.',
            ),

            commonCompanySignal(),
          ]);

        expect(
          result.recommendation.decision,
        ).toBe('single_product');

        expect(
          result.recommendation
            .primaryProduct
            ?.productContextId,
        ).toBe(
          'product:maintenance',
        );
      },
    );

    it(
      'selects Aura Signature for document signature needs',
      async () => {
        const result =
          await execute([
            signal(
              'signature:problem',
              'business_problem',
              'Tenemos problemas con aprobación de documentos y trazabilidad documental.',
            ),

            signal(
              'signature:capability',
              'required_capability',
              'Necesitamos firma electrónica y firma digital.',
            ),

            signal(
              'signature:operation',
              'operational_need',
              'Necesitamos firma de documentos y aprobación documental.',
            ),

            signal(
              'signature:interest',
              'declared_interest',
              'Nos interesa mejorar la firma electrónica de documentos.',
            ),

            commonCompanySignal(),
          ]);

        expect(
          result.recommendation.decision,
        ).toBe('single_product');

        expect(
          result.recommendation
            .primaryProduct
            ?.productContextId,
        ).toBe(
          'product:signature',
        );
      },
    );

    it(
      'does not let the shared mid-market customer fit determine product identity',
      async () => {
        const result =
          await execute([
            commonCompanySignal(),
          ]);

        expect(
          result.recommendation.decision,
        ).not.toBe(
          'single_product',
        );
      },
    );
  },
);
