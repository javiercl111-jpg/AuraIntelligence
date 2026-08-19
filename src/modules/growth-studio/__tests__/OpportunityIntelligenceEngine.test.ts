import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  evaluateOpportunityIntelligence,
  priorityFromOpportunityScore,
} from '../services/OpportunityIntelligenceEngine';

import type {
  GrowthOpportunitySignal,
} from '../types/growthOpportunity';

const signal = (
  id: string,
  type: GrowthOpportunitySignal['type'],
  strength: number,
): GrowthOpportunitySignal => ({
  id,
  type,
  strength,
  label: type,
  description: `${type} signal`,
  observedAt: '2026-08-18T10:00:00.000Z',
});

describe(
  'OpportunityIntelligenceEngine',
  () => {
    it('classifies opportunity priorities deterministically', () => {
      expect(
        priorityFromOpportunityScore(90),
      ).toBe('critical');

      expect(
        priorityFromOpportunityScore(75),
      ).toBe('high');

      expect(
        priorityFromOpportunityScore(55),
      ).toBe('medium');

      expect(
        priorityFromOpportunityScore(20),
      ).toBe('low');
    });

    it('produces a high score from strong commercial signals', () => {
      const result =
        evaluateOpportunityIntelligence({
          signals: [
            signal('fit-1', 'fit', 95),
            signal('intent-1', 'intent', 90),
            signal(
              'engagement-1',
              'engagement',
              85,
            ),
            signal(
              'timing-1',
              'timing',
              90,
            ),
          ],
        });

      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.confidence).toBe(80);
      expect(result.nextBestAction?.priority).toBe(
        'critical',
      );
      expect(result.rationale).toContain(
        'score',
      );
    });

    it('normalizes weights when only some weighted signals exist', () => {
      const result =
        evaluateOpportunityIntelligence({
          signals: [
            signal('fit-1', 'fit', 80),
            signal('intent-1', 'intent', 60),
          ],
        });

      expect(result.score).toBe(70);
      expect(result.confidence).toBe(40);
      expect(result.nextBestAction?.priority).toBe(
        'high',
      );
    });

    it('does not let unsupported signal types distort the weighted score', () => {
      const result =
        evaluateOpportunityIntelligence({
          signals: [
            signal('fit-1', 'fit', 80),
            signal(
              'relationship-1',
              'relationship',
              100,
            ),
          ],
        });

      expect(result.score).toBe(80);
      expect(result.confidence).toBe(40);
    });

    it('fails closed when no evidence exists', () => {
      const result =
        evaluateOpportunityIntelligence({
          signals: [],
        });

      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.nextBestAction).toBeNull();
      expect(result.rationale).toContain(
        'No hay señales suficientes',
      );
    });

    it('clamps invalid signal strength into the supported score range', () => {
      const result =
        evaluateOpportunityIntelligence({
          signals: [
            signal('fit-high', 'fit', 150),
            signal('intent-low', 'intent', -20),
          ],
        });

      expect(result.score).toBe(50);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  },
);
