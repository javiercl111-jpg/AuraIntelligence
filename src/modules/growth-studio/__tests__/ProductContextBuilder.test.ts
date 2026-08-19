import { describe, expect, it } from 'vitest';

import type {
  ProductKnowledgeIntake,
  ProductKnowledgeValue,
} from '../types/productKnowledgeIntake';

import { ProductContextBuilder } from '../services/ProductContextBuilder';

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

const makeIntake = (): ProductKnowledgeIntake => ({
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  name: confirmed(
    'Aura HCM',
    'user:name',
  ),

  category: confirmed(
    'Human Capital Management',
    'user:category',
  ),

  description: confirmed(
    'Human capital management platform',
    'user:description',
  ),

  problemsSolved: confirmed(
    ['Attendance management'],
    'user:problems',
  ),

  capabilities: confirmed(
    ['Attendance', 'Employee management'],
    'user:capabilities',
  ),

  benefits: confirmed(
    ['Operational visibility'],
    'user:benefits',
  ),

  differentiators: missing<string[]>(),

  idealCustomerProfiles: confirmed(
    ['Mid-market companies'],
    'user:icp',
  ),

  targetIndustries: missing<string[]>(),
  useCases: missing<string[]>(),

  pricingContext: missing<string>(),

  commercialEvidence: missing<string[]>(),

  claimsRestrictions: confirmed(
    ['Do not promise guaranteed results'],
    'user:claims',
  ),

  preferredMessages: missing<string[]>(),

  websiteUrl: missing<string>(),

  evidence: [
    {
      id: 'user:name',
      sourceType: 'user',
      label: 'Product name',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:category',
      sourceType: 'user',
      label: 'Product category',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:description',
      sourceType: 'user',
      label: 'Product description',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:problems',
      sourceType: 'user',
      label: 'Problems solved',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:capabilities',
      sourceType: 'user',
      label: 'Capabilities',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:benefits',
      sourceType: 'user',
      label: 'Benefits',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:icp',
      sourceType: 'user',
      label: 'Ideal customer',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'user:claims',
      sourceType: 'user',
      label: 'Claim restriction',
      capturedAt: '2026-08-19T00:00:00.000Z',
    },
  ],

  capturedAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T01:00:00.000Z',
});

describe('ProductContextBuilder', () => {
  it('builds ProductContext without inventing missing knowledge', () => {
    const result =
      ProductContextBuilder.build(makeIntake());

    expect(result.name.value).toBe('Aura HCM');

    expect(result.differentiators.status).toBe(
      'missing',
    );

    expect(result.targetIndustries.status).toBe(
      'missing',
    );

    expect(result.pricingContext.status).toBe(
      'missing',
    );
  });

  it('preserves tenant and company authority', () => {
    const result =
      ProductContextBuilder.build(makeIntake());

    expect(result.tenantId).toBe(
      'tenant-aura',
    );

    expect(result.companyId).toBe(
      'company-aura',
    );
  });

  it('creates deterministic product identity from known product name', () => {
    const result =
      ProductContextBuilder.build(makeIntake());

    expect(result.id).toBe(
      'product:tenant-aura:company-aura:aura-hcm',
    );

    expect(result.version).toBe(1);
  });

  it('preserves evidence and claim restrictions', () => {
    const result =
      ProductContextBuilder.build(makeIntake());

    expect(result.evidence.length).toBe(8);

    expect(
      result.claimsRestrictions.value,
    ).toEqual([
      'Do not promise guaranteed results',
    ]);
  });

  it('normalizes missing values to null and zero confidence', () => {
    const input = makeIntake();

    input.websiteUrl = {
      value: 'should-not-survive',
      status: 'missing',
      confidence: 100,
      evidenceIds: ['invalid'],
    };

    const result =
      ProductContextBuilder.build(input);

    expect(result.websiteUrl.value).toBeNull();
    expect(result.websiteUrl.confidence).toBe(0);
    expect(result.websiteUrl.evidenceIds).toEqual([]);
  });

  it('clamps confidence to the canonical 0-100 range', () => {
    const input = makeIntake();

    input.benefits.confidence = 150;

    const result =
      ProductContextBuilder.build(input);

    expect(result.benefits.confidence).toBe(100);
  });

  it('increments version when rebuilding an existing ProductContext', () => {
    const first =
      ProductContextBuilder.build(makeIntake());

    const second =
      ProductContextBuilder.build(
        makeIntake(),
        first,
      );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.createdAt).toBe(
      first.createdAt,
    );
  });
});
