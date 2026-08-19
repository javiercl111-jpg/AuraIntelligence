import { describe, expect, it } from 'vitest';

import type {
  ProductKnowledgeIntake,
  ProductKnowledgeValue,
} from '../types/productKnowledgeIntake';

import {
  PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS,
  PRODUCT_KNOWLEDGE_STRATEGY_REQUIRED_FIELDS,
} from '../types/productKnowledgeIntake';

const missing = <T>(): ProductKnowledgeValue<T> => ({
  value: null,
  status: 'missing',
  confidence: 0,
  evidenceIds: [],
});

describe('ProductKnowledgeIntake contract', () => {
  it('allows unknown product knowledge to remain explicitly missing', () => {
    const intake: ProductKnowledgeIntake = {
      tenantId: 'tenant-aura',
      companyId: 'company-aura',

      name: {
        value: 'Aura HCM',
        status: 'confirmed',
        confidence: 100,
        evidenceIds: ['user:product-name'],
      },

      category: missing<string>(),
      description: missing<string>(),

      problemsSolved: missing<string[]>(),
      capabilities: missing<string[]>(),
      benefits: missing<string[]>(),

      idealCustomerProfiles: missing<string[]>(),
      targetIndustries: missing<string[]>(),
      useCases: missing<string[]>(),

      differentiators: missing<string[]>(),

      commercialEvidence: missing<string[]>(),
      claimsRestrictions: missing<string[]>(),
      preferredMessages: missing<string[]>(),

      websiteUrl: missing<string>(),
      pricingContext: missing<string>(),

      evidence: [
        {
          id: 'user:product-name',
          sourceType: 'user',
          label: 'Product explicitly provided by user',
          capturedAt: '2026-08-19T00:00:00.000Z',
        },
      ],

      capturedAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
    };

    expect(intake.name.status).toBe('confirmed');
    expect(intake.problemsSolved.status).toBe('missing');
    expect(intake.benefits.status).toBe('missing');
  });

  it('defines strategy knowledge independently from outreach readiness', () => {
    expect(PRODUCT_KNOWLEDGE_STRATEGY_REQUIRED_FIELDS).toEqual([
      'name',
      'description',
      'problemsSolved',
      'benefits',
      'idealCustomerProfiles',
    ]);

    expect(
      PRODUCT_KNOWLEDGE_STRATEGY_REQUIRED_FIELDS,
    ).not.toContain('commercialEvidence');
  });

  it('identifies commercially sensitive claim fields', () => {
    expect(PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS).toContain(
      'benefits',
    );

    expect(PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS).toContain(
      'commercialEvidence',
    );

    expect(PRODUCT_KNOWLEDGE_CLAIM_SENSITIVE_FIELDS).toContain(
      'pricingContext',
    );
  });

  it('does not introduce Firebase, DENUE or delivery-engine concepts', async () => {
    const module = await import('../types/productKnowledgeIntake');

    const serialized = JSON.stringify(
      Object.keys(module),
    ).toLowerCase();

    expect(serialized).not.toContain('firebase');
    expect(serialized).not.toContain('firestore');
    expect(serialized).not.toContain('denue');
    expect(serialized).not.toContain('email');
  });
});
