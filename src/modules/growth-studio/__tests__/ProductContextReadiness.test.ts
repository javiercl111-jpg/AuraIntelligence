import { describe, expect, it } from 'vitest';

import type {
  ProductKnowledgeIntake,
  ProductKnowledgeValue,
} from '../types/productKnowledgeIntake';

import { ProductContextBuilder } from '../services/ProductContextBuilder';
import { ProductContextReadiness } from '../services/ProductContextReadiness';

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

const inferred = <T>(
  value: T,
): ProductKnowledgeValue<T> => ({
  value,
  status: 'inferred',
  confidence: 65,
  evidenceIds: [],
});

const evidence = (
  id: string,
) => ({
  id,
  sourceType: 'user' as const,
  label: id,
  capturedAt: '2026-08-19T00:00:00.000Z',
});

const baseIntake = (): ProductKnowledgeIntake => ({
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  name: confirmed('Aura HCM', 'ev:name'),
  category: missing<string>(),

  description: confirmed(
    'Human capital management platform',
    'ev:description',
  ),

  problemsSolved: confirmed(
    ['Attendance management'],
    'ev:problems',
  ),

  capabilities: missing<string[]>(),

  benefits: confirmed(
    ['Operational visibility'],
    'ev:benefits',
  ),

  differentiators: missing<string[]>(),

  idealCustomerProfiles: confirmed(
    ['Mid-market companies'],
    'ev:icp',
  ),

  targetIndustries: missing<string[]>(),
  useCases: missing<string[]>(),

  pricingContext: missing<string>(),

  commercialEvidence: missing<string[]>(),

  claimsRestrictions: confirmed(
    ['Do not guarantee outcomes'],
    'ev:claims',
  ),

  preferredMessages: missing<string[]>(),
  websiteUrl: missing<string>(),

  evidence: [
    evidence('ev:name'),
    evidence('ev:description'),
    evidence('ev:problems'),
    evidence('ev:benefits'),
    evidence('ev:icp'),
    evidence('ev:claims'),
  ],

  capturedAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T01:00:00.000Z',
});

describe('ProductContextReadiness', () => {
  it('classifies a name-only product as known but not strategy-ready', () => {
    const input = baseIntake();

    input.description = missing<string>();
    input.problemsSolved = missing<string[]>();
    input.benefits = missing<string[]>();
    input.idealCustomerProfiles = missing<string[]>();

    const context =
      ProductContextBuilder.build(input);

    const result =
      ProductContextReadiness.evaluate(context);

    expect(result.level).toBe('known');
    expect(result.strategyReady).toBe(false);
    expect(result.outreachReady).toBe(false);

    expect(result.missingStrategyFields).toContain(
      'description',
    );
  });

  it('classifies evidence-backed strategy knowledge as outreach-ready', () => {
    const context =
      ProductContextBuilder.build(baseIntake());

    const result =
      ProductContextReadiness.evaluate(context);

    expect(result.strategyReady).toBe(true);
    expect(result.outreachReady).toBe(true);
    expect(result.level).toBe('outreach_ready');
    expect(result.unsupportedEvidenceIds).toEqual([]);
    expect(result.unsafeClaimFields).toEqual([]);
  });

  it('detects dangling evidence references', () => {
    const input = baseIntake();

    input.problemsSolved.evidenceIds = [
      'ev:does-not-exist',
    ];

    const context =
      ProductContextBuilder.build(input);

    const result =
      ProductContextReadiness.evaluate(context);

    expect(
      result.unsupportedEvidenceIds,
    ).toEqual([
      'ev:does-not-exist',
    ]);

    expect(result.strategyReady).toBe(false);
    expect(result.outreachReady).toBe(false);
  });

  it('blocks outreach when a sensitive claim is inferred', () => {
    const input = baseIntake();

    input.benefits = inferred([
      'Potential productivity improvement',
    ]);

    const context =
      ProductContextBuilder.build(input);

    const result =
      ProductContextReadiness.evaluate(context);

    expect(result.strategyReady).toBe(true);
    expect(result.outreachReady).toBe(false);

    expect(result.unsafeClaimFields).toContain(
      'benefits',
    );

    expect(result.level).toBe(
      'strategy_ready',
    );
  });

  it('blocks outreach when a confirmed sensitive claim lacks evidence', () => {
    const input = baseIntake();

    input.benefits = {
      value: ['Operational visibility'],
      status: 'confirmed',
      confidence: 100,
      evidenceIds: [],
    };

    const context =
      ProductContextBuilder.build(input);

    const result =
      ProductContextReadiness.evaluate(context);

    expect(result.strategyReady).toBe(true);
    expect(result.outreachReady).toBe(false);

    expect(result.unsafeClaimFields).toContain(
      'benefits',
    );
  });

  it('does not require unknown pricing to become strategy-ready', () => {
    const context =
      ProductContextBuilder.build(baseIntake());

    const result =
      ProductContextReadiness.evaluate(context);

    expect(context.pricingContext.status).toBe(
      'missing',
    );

    expect(result.strategyReady).toBe(true);
  });
});
