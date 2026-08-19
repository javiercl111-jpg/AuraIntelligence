import { describe, expect, it } from 'vitest';

import type {
  ProductKnowledgeIntake,
  ProductKnowledgeValue,
} from '../types/productKnowledgeIntake';

import {
  ProductContextBuilder,
} from '../services/ProductContextBuilder';

import {
  ProductKnowledgeAcquisitionPlanner,
} from '../services/ProductKnowledgeAcquisitionPlanner';

const missing = <T>(): ProductKnowledgeValue<T> => ({
  value: null,
  status: 'missing',
  confidence: 0,
  evidenceIds: [],
});

const confirmed = <T>(
  value: T,
  evidenceId: string,
): ProductKnowledgeValue<T> => ({
  value,
  status: 'confirmed',
  confidence: 100,
  evidenceIds: [evidenceId],
});

const evidence = (id: string) => ({
  id,
  sourceType: 'user' as const,
  label: id,
  capturedAt: '2026-08-19T00:00:00.000Z',
});

const makeIntake =
  (): ProductKnowledgeIntake => ({
    tenantId: 'tenant-aura',
    companyId: 'company-aura',

    name: confirmed(
      'Aura HCM',
      'ev:name',
    ),

    category: missing<string>(),

    description: missing<string>(),

    problemsSolved: missing<string[]>(),

    capabilities: missing<string[]>(),

    benefits: missing<string[]>(),

    differentiators: missing<string[]>(),

    idealCustomerProfiles: missing<string[]>(),

    targetIndustries: missing<string[]>(),

    useCases: missing<string[]>(),

    pricingContext: missing<string>(),

    commercialEvidence: missing<string[]>(),

    claimsRestrictions: missing<string[]>(),

    preferredMessages: missing<string[]>(),

    websiteUrl: missing<string>(),

    evidence: [
      evidence('ev:name'),
    ],

    capturedAt:
      '2026-08-19T00:00:00.000Z',

    updatedAt:
      '2026-08-19T01:00:00.000Z',
  });

describe(
  'ProductKnowledgeAcquisitionPlanner',
  () => {
    it(
      'asks for description after product name is known',
      () => {
        const context =
          ProductContextBuilder.build(
            makeIntake(),
          );

        const plan =
          ProductKnowledgeAcquisitionPlanner.plan(
            context,
          );

        expect(plan.readinessLevel).toBe(
          'known',
        );

        expect(plan.nextStep?.field).toBe(
          'description',
        );

        expect(
          plan.nextStep?.blocksStrategy,
        ).toBe(true);
      },
    );

    it(
      'progresses to problems solved after description',
      () => {
        const input = makeIntake();

        input.description = confirmed(
          'Human capital management platform',
          'ev:description',
        );

        input.evidence.push(
          evidence('ev:description'),
        );

        const context =
          ProductContextBuilder.build(input);

        const plan =
          ProductKnowledgeAcquisitionPlanner.plan(
            context,
          );

        expect(plan.nextStep?.field).toBe(
          'problemsSolved',
        );
      },
    );

    it(
      'prioritizes outreach claim safety after strategy gaps are complete',
      () => {
        const input = makeIntake();

        input.description = confirmed(
          'Human capital management platform',
          'ev:description',
        );

        input.problemsSolved = confirmed(
          ['Attendance management'],
          'ev:problems',
        );

        input.benefits = {
          value: ['Potential productivity improvement'],
          status: 'inferred',
          confidence: 65,
          evidenceIds: [],
        };

        input.idealCustomerProfiles = confirmed(
          ['Mid-market companies'],
          'ev:icp',
        );

        input.evidence.push(
          evidence('ev:description'),
          evidence('ev:problems'),
          evidence('ev:icp'),
        );

        const context =
          ProductContextBuilder.build(input);

        const plan =
          ProductKnowledgeAcquisitionPlanner.plan(
            context,
          );

        expect(
          plan.remainingStrategyGaps,
        ).toEqual([]);

        expect(plan.nextStep?.field).toBe(
          'benefits',
        );

        expect(
          plan.nextStep?.blocksStrategy,
        ).toBe(false);

        expect(
          plan.nextStep?.blocksOutreach,
        ).toBe(true);
      },
    );

    it(
      'returns no acquisition step when product is outreach-ready',
      () => {
        const input = makeIntake();

        input.description = confirmed(
          'Human capital management platform',
          'ev:description',
        );

        input.problemsSolved = confirmed(
          ['Attendance management'],
          'ev:problems',
        );

        input.benefits = confirmed(
          ['Operational visibility'],
          'ev:benefits',
        );

        input.idealCustomerProfiles = confirmed(
          ['Mid-market companies'],
          'ev:icp',
        );

        input.evidence.push(
          evidence('ev:description'),
          evidence('ev:problems'),
          evidence('ev:benefits'),
          evidence('ev:icp'),
        );

        const context =
          ProductContextBuilder.build(input);

        const plan =
          ProductKnowledgeAcquisitionPlanner.plan(
            context,
          );

        expect(plan.readinessLevel).toBe(
          'outreach_ready',
        );

        expect(plan.nextStep).toBeNull();
      },
    );
  },
);
