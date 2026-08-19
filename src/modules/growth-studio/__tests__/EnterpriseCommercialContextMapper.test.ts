import { describe, expect, it } from 'vitest';

import type { BrandBrain } from '../types/brandBrain';
import { EnterpriseCommercialContextMapper } from '../services/EnterpriseCommercialContextMapper';

const brain = (): BrandBrain => ({
  id: 'bb-aura',
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  companyProfile: {
    companyName: {
      value: 'Aura Nexus',
      status: 'confirmed',
      confidence: 'high',
      source: 'user_correction',
      evidence: 'Confirmed by user',
    },
    businessDescription: {
      value: 'Enterprise AI platform',
      status: 'inferred',
      confidence: 'medium',
      source: 'conversation',
      evidence: 'Derived from conversation',
    },
  },

  industry: {
    value: 'Enterprise Software',
    status: 'confirmed',
    confidence: 'high',
    source: 'user_correction',
    evidence: 'Confirmed industry',
  },

  products: {
    value: ['Aura HCM'],
    status: 'confirmed',
    confidence: 'high',
    source: 'growth_objective',
    evidence: 'Selected product',
  },

  valueProposition: {
    value: 'Operational intelligence',
    status: 'confirmed',
    confidence: 'high',
    source: 'user_correction',
    evidence: 'Confirmed value proposition',
  },

  targetAudience: {
    value: 'Mid-market companies',
    status: 'confirmed',
    confidence: 'high',
    source: 'growth_objective',
    evidence: 'Campaign audience',
  },

  brandTone: {
    value: null,
    status: 'missing',
    confidence: 'low',
  },

  differentiators: {
    value: ['AI-native', 'Modular'],
    status: 'confirmed',
    confidence: 'high',
    source: 'user_correction',
    evidence: 'Confirmed differentiators',
  },

  communicationStyle: {
    value: 'Executive',
    status: 'confirmed',
    confidence: 'medium',
    source: 'user_correction',
    evidence: 'Confirmed style',
  },

  businessGoals: {
    value: ['Grow commercial adoption'],
    status: 'inferred',
    confidence: 'medium',
    source: 'growth_objective',
    evidence: 'Derived from objective',
  },

  knownFacts: [],
  missingKnowledge: [],
  confidenceScore: 75,

  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
});

describe('EnterpriseCommercialContextMapper', () => {
  it('maps enterprise fields without importing BrandBrain products as ProductContext', () => {
    const result = EnterpriseCommercialContextMapper.fromBrandBrain(brain());

    expect(result.tenantId).toBe('tenant-aura');
    expect(result.companyId).toBe('company-aura');
    expect(result.companyName.value).toBe('Aura Nexus');
    expect(result.industry.value).toBe('Enterprise Software');

    expect(JSON.stringify(result)).not.toContain('Aura HCM');
  });

  it('does not silently map campaign audience to enterprise target markets', () => {
    const result = EnterpriseCommercialContextMapper.fromBrandBrain(brain());

    expect(result.targetMarkets.status).toBe('missing');
    expect(result.targetMarkets.value).toBeNull();
  });

  it('preserves knowledge status and creates normalized evidence references', () => {
    const result = EnterpriseCommercialContextMapper.fromBrandBrain(brain());

    expect(result.companyName.status).toBe('confirmed');
    expect(result.companyName.confidence).toBe(90);
    expect(result.companyName.evidenceIds).toEqual([
      'brand-brain:companyName',
    ]);

    expect(result.businessDescription.status).toBe('inferred');
    expect(result.businessDescription.confidence).toBe(65);

    expect(result.brandTone.status).toBe('missing');
    expect(result.brandTone.confidence).toBe(0);

    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('preserves tenant/company authority and produces deterministic identity', () => {
    const result = EnterpriseCommercialContextMapper.fromBrandBrain(brain());

    expect(result.id).toBe(
      'enterprise:tenant-aura:company-aura',
    );

    expect(result.version).toBe(1);
    expect(result.status).toBe('draft');
  });
});
