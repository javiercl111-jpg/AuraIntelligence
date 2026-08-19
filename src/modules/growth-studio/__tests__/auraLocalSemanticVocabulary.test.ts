import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  AURA_LOCAL_SEMANTIC_VOCABULARY,
  AuraLocalSemanticVocabulary,
} from '../../../services/auraLocalSemanticVocabulary';

describe(
  'AuraLocalSemanticVocabulary',
  () => {

    it(
      'normalizes accents, casing and punctuation deterministically',
      () => {
        expect(
          AuraLocalSemanticVocabulary.normalize(
            '  Gestión de PERSONAL, ¡RH! ',
          ),
        ).toBe(
          'gestion de personal rh',
        );
      },
    );

    it(
      'detects workforce attendance from natural business language',
      () => {
        const matches =
          AuraLocalSemanticVocabulary.detect(
            'Tenemos muchos retardos y problemas con el reloj checador.',
          );

        expect(
          matches.some(
            item =>
              item.concept ===
              'WORKFORCE_ATTENDANCE',
          ),
        ).toBe(true);
      },
    );

    it(
      'detects asset maintenance without product knowledge',
      () => {
        const matches =
          AuraLocalSemanticVocabulary.detect(
            'Tenemos fallas recurrentes y varias máquinas paradas.',
          );

        expect(
          matches.some(
            item =>
              item.concept ===
              'ASSET_MAINTENANCE',
          ),
        ).toBe(true);
      },
    );

    it(
      'can detect more than one business concept in the same text',
      () => {
        const matches =
          AuraLocalSemanticVocabulary.detect(
            'Necesitamos mantenimiento preventivo y mejorar las órdenes de trabajo.',
          );

        const concepts =
          matches.map(
            item =>
              item.concept,
          );

        expect(concepts)
          .toContain(
            'ASSET_MAINTENANCE',
          );

        expect(concepts)
          .toContain(
            'WORK_ORDER_MANAGEMENT',
          );
      },
    );

    it(
      'returns no concepts when business meaning is unsupported',
      () => {
        expect(
          AuraLocalSemanticVocabulary.detect(
            'Necesitamos revisar este asunto.',
          ),
        ).toEqual([]);
      },
    );

    it(
      'contains business concepts rather than Aura product identifiers',
      () => {
        const serialized =
          JSON.stringify(
            AURA_LOCAL_SEMANTIC_VOCABULARY,
          ).toLowerCase();

        expect(serialized)
          .not.toContain(
            'aura hcm',
          );

        expect(serialized)
          .not.toContain(
            'aura maintenance',
          );

        expect(serialized)
          .not.toContain(
            'aura signature',
          );

        expect(serialized)
          .not.toContain(
            'aura growth',
          );

        expect(serialized)
          .not.toContain(
            'aura intelligence',
          );
      },
    );

    it(
      'does not assign commercial scores or recommendations',
      () => {
        const serialized =
          JSON.stringify(
            AURA_LOCAL_SEMANTIC_VOCABULARY,
          );

        expect(serialized)
          .not.toContain(
            'productContextId',
          );

        expect(serialized)
          .not.toContain(
            'contribution',
          );

        expect(serialized)
          .not.toContain(
            'recommendationStatus',
          );
      },
    );

    it(
      'detects mid-market customer segment in Spanish and English',
      () => {
        const spanish =
          AuraLocalSemanticVocabulary.detect(
            'Somos una empresa mediana.',
          );

        const english =
          AuraLocalSemanticVocabulary.detect(
            'We are a mid-market company.',
          );

        expect(
          spanish.some(
            item =>
              item.concept ===
              'MID_MARKET_COMPANY',
          ),
        ).toBe(true);

        expect(
          english.some(
            item =>
              item.concept ===
              'MID_MARKET_COMPANY',
          ),
        ).toBe(true);
      },
    );
  },
);
