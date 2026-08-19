import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  SolutionMatchEvidence,
} from '../types/solutionMatching';

import {
  SolutionMatchingPolicy,
} from '../services/SolutionMatchingPolicy';

const ev = (
  id: string,
  signalId: string,
  dimension:
    SolutionMatchEvidence['dimension'],
  contribution: number,
): SolutionMatchEvidence => ({
  id,
  signalId,
  productContextId: 'product:hcm',
  dimension,
  contribution,
  explanation: id,
});

describe(
  'SolutionMatchingPolicy',
  () => {

    it(
      'recommends a product only with sufficient score, confidence and strong evidence',
      () => {
        const result =
          SolutionMatchingPolicy.evaluate(
            [
              ev(
                'ev:problem',
                'sig:problem',
                'problem_fit',
                30,
              ),
              ev(
                'ev:capability',
                'sig:capability',
                'capability_fit',
                25,
              ),
              ev(
                'ev:customer',
                'sig:customer',
                'customer_fit',
                15,
              ),
            ],
            {
              'sig:problem': 95,
              'sig:capability': 90,
              'sig:customer': 80,
            },
          );

        expect(result.score).toBe(70);

        expect(
          result.confidence,
        ).toBeGreaterThanOrEqual(60);

        expect(
          result.strongEvidencePresent,
        ).toBe(true);

        expect(
          result.recommendationStatus,
        ).toBe('recommended');
      },
    );

    it(
      'never recommends from industry fit alone',
      () => {
        const result =
          SolutionMatchingPolicy.evaluate(
            [
              ev(
                'ev:industry',
                'sig:industry',
                'industry_fit',
                10,
              ),
            ],
            {
              'sig:industry': 100,
            },
          );

        expect(result.score).toBe(10);

        expect(
          result.strongEvidencePresent,
        ).toBe(false);

        expect(
          result.recommendationStatus,
        ).toBe(
          'insufficient_evidence',
        );
      },
    );

    it(
      'does not allow repeated evidence to exceed a dimension maximum',
      () => {
        const result =
          SolutionMatchingPolicy.evaluate(
            [
              ev(
                'ev:p1',
                'sig:p1',
                'problem_fit',
                25,
              ),
              ev(
                'ev:p2',
                'sig:p2',
                'problem_fit',
                25,
              ),
            ],
            {
              'sig:p1': 100,
              'sig:p2': 100,
            },
          );

        expect(result.score).toBe(30);
      },
    );

    it(
      'returns possible when meaningful fit exists but recommendation threshold is not reached',
      () => {
        const result =
          SolutionMatchingPolicy.evaluate(
            [
              ev(
                'ev:problem',
                'sig:problem',
                'problem_fit',
                30,
              ),
              ev(
                'ev:customer',
                'sig:customer',
                'customer_fit',
                15,
              ),
            ],
            {
              'sig:problem': 90,
              'sig:customer': 90,
            },
          );

        expect(result.score).toBe(45);

        expect(
          result.recommendationStatus,
        ).toBe('possible');
      },
    );

    it(
      'fails closed when score is high but signal confidence is weak',
      () => {
        const result =
          SolutionMatchingPolicy.evaluate(
            [
              ev(
                'ev:problem',
                'sig:problem',
                'problem_fit',
                30,
              ),
              ev(
                'ev:capability',
                'sig:capability',
                'capability_fit',
                25,
              ),
              ev(
                'ev:customer',
                'sig:customer',
                'customer_fit',
                15,
              ),
            ],
            {
              'sig:problem': 30,
              'sig:capability': 30,
              'sig:customer': 30,
            },
          );

        expect(result.score).toBe(70);
        expect(result.confidence).toBe(30);

        expect(
          result.recommendationStatus,
        ).not.toBe('recommended');

        expect(
          result.knowledgeGaps.length,
        ).toBeGreaterThan(0);
      },
    );

    it(
      'returns not-recommended when there is no supported evidence',
      () => {
        const result =
          SolutionMatchingPolicy.evaluate(
            [],
            {},
          );

        expect(result.score).toBe(0);

        expect(
          result.recommendationStatus,
        ).toBe('not_recommended');
      },
    );
  },
);
