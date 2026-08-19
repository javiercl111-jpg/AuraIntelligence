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
  AuraLocalConceptAlignmentEngine,
} from '../../../services/auraLocalConceptAlignmentEngine';

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
      'product:test',

    tenantId:
      'tenant-aura',

    companyId:
      'company-aura',

    name:
      field('Test Product'),

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
  value: string,
  confidence = 95,
): SolutionMatchingSignal => ({
  id,

  kind:
    'business_problem',

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
  'AuraLocalConceptAlignmentEngine',
  () => {

    it(
      'aligns the same canonical concept across Spanish prospect and English product knowledge',
      () => {
        const result =
          AuraLocalConceptAlignmentEngine.align(
            [
              signal(
                'sig:attendance',
                'Tenemos problemas con el reloj checador y retardos.',
              ),
            ],
            product(),
          );

        expect(
          result.alignments,
        ).toHaveLength(1);

        expect(
          result.alignments[0]
            .concept,
        ).toBe(
          'WORKFORCE_ATTENDANCE',
        );

        expect(
          result.alignments[0]
            .semanticStrength,
        ).toBe(100);
      },
    );

    it(
      'does not inflate semantic strength when multiple aliases express the same concept',
      () => {
        const result =
          AuraLocalConceptAlignmentEngine.align(
            [
              signal(
                'sig:attendance',
                'Asistencia, retardos, puntualidad y reloj checador.',
              ),
            ],
            product(),
          );

        expect(
          result.alignments,
        ).toHaveLength(1);

        expect(
          result.alignments[0]
            .semanticStrength,
        ).toBe(100);
      },
    );

    it(
      'uses prospect signal confidence without allowing repeated aliases to inflate it',
      () => {
        const result =
          AuraLocalConceptAlignmentEngine.align(
            [
              signal(
                'sig:attendance',
                'Control de asistencia y retardos.',
                82,
              ),
            ],
            product(),
          );

        expect(
          result.alignments[0]
            .confidence,
        ).toBe(82);
      },
    );

    it(
      'returns prospect concepts as unmatched when the product does not support them',
      () => {
        const result =
          AuraLocalConceptAlignmentEngine.align(
            [
              signal(
                'sig:signature',
                'Necesitamos firma electrónica y trazabilidad documental.',
              ),
            ],
            product(),
          );

        expect(
          result.alignments,
        ).toEqual([]);

        expect(
          result.unmatchedProspectConcepts,
        ).toContain(
          'DOCUMENT_GOVERNANCE',
        );
      },
    );

    it(
      'preserves product-side unmatched concepts for explainability',
      () => {
        const result =
          AuraLocalConceptAlignmentEngine.align(
            [
              signal(
                'sig:attendance',
                'Control de asistencia.',
              ),
            ],
            product(),
          );

        expect(
          result.unmatchedProductConcepts,
        ).toContain(
          'WORKFORCE_ADMINISTRATION',
        );
      },
    );
  },
);
