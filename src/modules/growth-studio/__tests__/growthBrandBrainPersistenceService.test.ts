import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock(
  '../../../firebase',
  () => ({
    db: {},
  }),
);

vi.mock(
  'firebase/firestore',
  () => ({
    doc: vi.fn(
      (
        _db: unknown,
        collection: string,
        id: string,
      ) => ({
        collection,
        id,
      }),
    ),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
  }),
);

import {
  buildBrandBrainFromSettings,
  isPersistableGrowthCompanyId,
} from '../services/growthBrandBrainPersistenceService';

describe(
  'growthBrandBrainPersistenceService',
  () => {
    it(
      'rejects demo company identifiers',
      () => {
        expect(
          isPersistableGrowthCompanyId(
            'aura_demo',
          ),
        ).toBe(false);

        expect(
          isPersistableGrowthCompanyId(
            'growth_demo_company',
          ),
        ).toBe(false);

        expect(
          isPersistableGrowthCompanyId(
            'company-aura',
          ),
        ).toBe(true);
      },
    );

    it(
      'builds a fully confirmed company-bound Brand Brain',
      () => {
        const result =
          buildBrandBrainFromSettings(
            'company-aura',
            {
              companyName:
                'Aura Nexus',
              businessDescription:
                'Plataforma empresarial inteligente.',
              industry:
                'Software empresarial',
              products: [
                'Aura HCM',
                'Aura Intelligence',
              ],
              valueProposition:
                'Inteligencia integrada para operar y crecer.',
              targetAudience:
                'Empresas B2B',
              brandTone:
                'Profesional e innovador',
              differentiators: [
                'IA integrada',
                'Ecosistema modular',
              ],
              communicationStyle:
                'Ejecutivo y directo',
              businessGoals: [
                'Generar oportunidades',
                'Aumentar ventas',
              ],
            },
          );

        expect(
          result.companyId,
        ).toBe(
          'company-aura',
        );

        expect(
          result.tenantId,
        ).toBe(
          'company-aura',
        );

        expect(
          result.companyProfile
            .companyName.value,
        ).toBe(
          'Aura Nexus',
        );

        expect(
          result.confidenceScore,
        ).toBe(100);

        expect(
          result.missingKnowledge,
        ).toHaveLength(0);
      },
    );

    it(
      'keeps missing fields explicit and fail-closed',
      () => {
        const result =
          buildBrandBrainFromSettings(
            'company-aura',
            {
              companyName:
                'Aura Nexus',
              businessDescription:
                '',
              industry: '',
              products: [],
              valueProposition:
                '',
              targetAudience:
                '',
              brandTone: '',
              differentiators: [],
              communicationStyle:
                '',
              businessGoals: [],
            },
          );

        expect(
          result.confidenceScore,
        ).toBe(5);

        expect(
          result.companyProfile
            .businessDescription
            .status,
        ).toBe('missing');

        expect(
          result.missingKnowledge
            .length,
        ).toBeGreaterThan(0);
      },
    );
  },
);