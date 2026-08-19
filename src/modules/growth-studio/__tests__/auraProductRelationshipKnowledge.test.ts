import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  AuraProductRelationshipKnowledge,
} from '../../../services/auraProductRelationshipKnowledge';

const evidence = [
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
  'AuraProductRelationshipKnowledge',
  () => {

    it(
      'resolves an evidence-backed HCM to Signature complementary relationship',
      () => {
        const result =
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

            evidence,
          });

        expect(result)
          .toHaveLength(1);

        expect(
          result[0]
            .primaryProductContextId,
        ).toBe(
          'product:hcm',
        );

        expect(
          result[0]
            .supportingProductContextId,
        ).toBe(
          'product:signature',
        );
      },
    );

    it(
      'fails closed when relationship evidence is missing',
      () => {
        const result =
          AuraProductRelationshipKnowledge.resolve({
            relationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Complementary workflow.',

                evidenceIds: [
                  'ev:not-present',
                ],
              },
            ],

            evidence,
          });

        expect(result)
          .toEqual([]);
      },
    );

    it(
      'rejects relationships without evidence IDs',
      () => {
        const result =
          AuraProductRelationshipKnowledge.resolve({
            relationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Complementary workflow.',

                evidenceIds: [],
              },
            ],

            evidence,
          });

        expect(result)
          .toEqual([]);
      },
    );

    it(
      'rejects self relationships',
      () => {
        const result =
          AuraProductRelationshipKnowledge.resolve({
            relationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:hcm',

                reason:
                  'Invalid self relationship.',

                evidenceIds: [
                  'ev:hcm-signature-manual',
                ],
              },
            ],

            evidence,
          });

        expect(result)
          .toEqual([]);
      },
    );

    it(
      'deduplicates the same directional relationship',
      () => {
        const relationship = {
          primaryProductContextId:
            'product:hcm',

          supportingProductContextId:
            'product:signature',

          reason:
            'Evidence-backed complementary workflow.',

          evidenceIds: [
            'ev:hcm-signature-manual',
          ],
        };

        const result =
          AuraProductRelationshipKnowledge.resolve({
            relationships: [
              relationship,
              relationship,
            ],

            evidence,
          });

        expect(result)
          .toHaveLength(1);
      },
    );

    it(
      'does not infer reverse relationships automatically',
      () => {
        const result =
          AuraProductRelationshipKnowledge.resolve({
            relationships: [
              {
                primaryProductContextId:
                  'product:hcm',

                supportingProductContextId:
                  'product:signature',

                reason:
                  'Evidence-backed complementary workflow.',

                evidenceIds: [
                  'ev:hcm-signature-manual',
                ],
              },
            ],

            evidence,
          });

        expect(
          result.some(
            item =>
              item.primaryProductContextId ===
                'product:signature' &&
              item.supportingProductContextId ===
                'product:hcm',
          ),
        ).toBe(false);
      },
    );
  },
);
