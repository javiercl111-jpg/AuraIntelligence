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
  AuraProductRelationshipKnowledge,
} from '../../../services/auraProductRelationshipKnowledge';

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
  description: string,
  problemsSolved: string[],
  capabilities: string[],
  useCases: string[],
): ProductContext => ({
  id,
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  name: field(name),
  category: field('Business Software'),
  description: field(description),

  problemsSolved: field(problemsSolved),
  capabilities: field(capabilities),

  benefits: field([]),
  differentiators: field([]),

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

const signature = () =>
  product(
    'product:signature',
    'Aura Signature',
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
        id: 'entry:signature',

        productContext: {
          productContextId:
            'product:signature',
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

const signals = () => [
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
    'Necesitamos mejorar la operación de asistencia.',
  ),

  signal(
    'hcm:interest',
    'declared_interest',
    'Nos interesa mejorar el control de asistencia.',
  ),

  signal(
    'signature:problem',
    'business_problem',
    'También tenemos problemas con aprobación de documentos y trazabilidad documental.',
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
    'sig:company',
    'company_size',
    'Somos una empresa mediana.',
  ),
];

const relationshipEvidence = [
  {
    id:
      'ev:hcm-signature-manual',

    sourceType:
      'product_document' as const,

    sourceRef:
      'knowledge:manual-electronic-signature',

    label:
      'Manual: Proceso de Firma Electrónica en Aura HCM y Aura Signature',
  },
];

describe(
  'Local HCM + Signature bundle E2E',
  () => {

    it(
      'creates an evidence-backed HCM plus Signature solution bundle',
      async () => {
        const intelligence =
          new AuraLocalCommercialSemanticIntelligence();

        const semantic =
          await intelligence.analyze({
            tenantId: 'tenant-aura',
            companyId: 'company-aura',
            signals: signals(),
            products: [
              hcm(),
              signature(),
            ],
            requestId:
              'bundle:semantic',
          });

        expect(semantic.status)
          .toBe('valid');

        const hcmMatch =
          semantic.matches.find(
            item =>
              item.productContextId ===
                'product:hcm',
          );

        const signatureMatch =
          semantic.matches.find(
            item =>
              item.productContextId ===
                'product:signature',
          );

        expect(hcmMatch)
          .toBeDefined();

        expect(signatureMatch)
          .toBeDefined();

        /*
         * The relationship knowledge itself is supported by
         * product-document evidence.
         */
        const relationships =
          AuraProductRelationshipKnowledge.resolve({
            relationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'HR document workflows can require electronic signature and document traceability.',

                evidenceIds: [
                  'ev:hcm-signature-manual',
                ],
              },
            ],

            evidence:
              relationshipEvidence,
          });

        expect(relationships)
          .toHaveLength(1);

        /*
         * First execute without bundle relationship to obtain
         * the commercial evidence generated by the semantic
         * pipeline.
         */
        const baseline =
          await new CommercialSemanticMatchingOrchestrator(
            intelligence,
          ).execute({
            portfolio:
              portfolio(),

            signals:
              signals(),

            products: [
              hcm(),
              signature(),
            ],

            complementaryRelationships:
              [],

            requestId:
              'bundle:baseline',

            generatedAt:
              '2026-08-19T07:00:00.000Z',
          });

        expect(
          baseline.recommendation
            .decision,
        ).toBe(
          'single_product',
        );

        expect(
          baseline.recommendation
            .primaryProduct
            ?.productContextId,
        ).toBe(
          'product:hcm',
        );

        const signatureCandidate =
          baseline.recommendation
            .candidates.find(
              item =>
                item.productContext
                  .productContextId ===
                'product:signature',
            );

        expect(signatureCandidate)
          .toBeDefined();

        expect(
          signatureCandidate?.score,
        ).toBeGreaterThanOrEqual(45);

        /*
         * Bundle Policy requires relationship evidence IDs to
         * belong to the SAME commercial execution.
         *
         * CommercialSemanticEvidencePolicy creates deterministic
         * evidence IDs from:
         *
         * requestId + productContextId + signalId + dimension
         *
         * The final execution below uses requestId "bundle:final".
         * Therefore the supporting Signature problem evidence is
         * deterministically addressable before execution without
         * borrowing evidence identity from the baseline run.
         *
         * Product-document relationship authority remains
         * independently proven above.
         */
        const finalSignatureProblemEvidenceId =
          'semantic:bundle:final:' +
          'product:signature:' +
          'signature:problem:' +
          'problem_fit';

        const commercialRelationships =
          relationships.map(
            relationship => ({
              ...relationship,

              evidenceIds: [
                finalSignatureProblemEvidenceId,
              ],
            }),
          );

        const result =
          await new CommercialSemanticMatchingOrchestrator(
            intelligence,
          ).execute({
            portfolio:
              portfolio(),

            signals:
              signals(),

            products: [
              hcm(),
              signature(),
            ],

            complementaryRelationships:
              commercialRelationships,

            requestId:
              'bundle:final',

            generatedAt:
              '2026-08-19T07:05:00.000Z',
          });

        expect(
          result.recommendation
            .decision,
        ).toBe(
          'solution_bundle',
        );

        expect(
          result.recommendation
            .bundle,
        ).toBeDefined();

        const items =
          result.recommendation
            .bundle
            ?.items || [];

        expect(
          items.some(
            item =>
              item.role === 'primary' &&
              item.productContext
                .productContextId ===
                'product:hcm',
          ),
        ).toBe(true);

        expect(
          items.some(
            item =>
              item.role === 'supporting' &&
              item.productContext
                .productContextId ===
                'product:signature',
          ),
        ).toBe(true);
      },
    );

    it(
      'does not create the bundle when relationship knowledge is absent',
      async () => {
        const result =
          await new CommercialSemanticMatchingOrchestrator(
            new AuraLocalCommercialSemanticIntelligence(),
          ).execute({
            portfolio:
              portfolio(),

            signals:
              signals(),

            products: [
              hcm(),
              signature(),
            ],

            complementaryRelationships:
              [],

            requestId:
              'bundle:no-relationship',

            generatedAt:
              '2026-08-19T07:10:00.000Z',
          });

        expect(
          result.recommendation
            .decision,
        ).not.toBe(
          'solution_bundle',
        );
      },
    );
  },
);
