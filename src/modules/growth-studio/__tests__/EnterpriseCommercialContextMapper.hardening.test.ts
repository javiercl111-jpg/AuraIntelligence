import { describe, expect, it } from 'vitest';

import type { BrandBrain } from '../types/brandBrain';
import { EnterpriseCommercialContextMapper } from '../services/EnterpriseCommercialContextMapper';

const makeBrain = (): BrandBrain => ({
  id: 'bb-hardening',
  tenantId: 'tenant-hardening',
  companyId: 'company-hardening',

  companyProfile: {
    companyName: {
      value: 'Aura Nexus',
      status: 'confirmed',
      confidence: 'high',
      source: 'user_correction',
      evidence: 'Confirmed company name',
    },
    businessDescription: {
      value: 'Enterprise AI platform',
      status: 'confirmed',
      confidence: 'medium',
      source: 'user_correction',
      evidence: 'Confirmed description',
    },
  },

  industry: {
    value: 'Software',
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
    value: 'Enterprise intelligence',
    status: 'confirmed',
    confidence: 'high',
    source: 'user_correction',
    evidence: 'Confirmed proposition',
  },

  targetAudience: {
    value: 'Hotels',
    status: 'confirmed',
    confidence: 'high',
    source: 'growth_objective',
    evidence: 'Campaign audience',
  },

  brandTone: {
    value: 'Executive',
    status: 'confirmed',
    confidence: 'medium',
    source: 'user_correction',
    evidence: 'Confirmed tone',
  },

  differentiators: {
    value: ['AI-native'],
    status: 'confirmed',
    confidence: 'high',
    source: 'user_correction',
    evidence: 'Confirmed differentiator',
  },

  communicationStyle: {
    value: 'Professional',
    status: 'confirmed',
    confidence: 'medium',
    source: 'user_correction',
    evidence: 'Confirmed communication style',
  },

  businessGoals: {
    value: ['Increase adoption'],
    status: 'confirmed',
    confidence: 'medium',
    source: 'user_correction',
    evidence: 'Confirmed business goal',
  },

  knownFacts: [],
  missingKnowledge: [],
  confidenceScore: 90,

  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
});

describe('EnterpriseCommercialContextMapper hardening', () => {
  it('downgrades confirmed knowledge without source/evidence to inferred', () => {
    const input = makeBrain();

    input.industry = {
      value: 'Software',
      status: 'confirmed',
      confidence: 'high',
    };

    const result =
      EnterpriseCommercialContextMapper.fromBrandBrain(input);

    expect(result.industry.status).toBe('inferred');
    expect(result.industry.evidenceIds).toEqual([]);
  });

  it('normalizes missing knowledge to null with zero confidence', () => {
    const input = makeBrain();

    input.brandTone = {
      value: 'Should not survive',
      status: 'missing',
      confidence: 'high',
    };

    const result =
      EnterpriseCommercialContextMapper.fromBrandBrain(input);

    expect(result.brandTone.value).toBeNull();
    expect(result.brandTone.status).toBe('missing');
    expect(result.brandTone.confidence).toBe(0);
    expect(result.brandTone.evidenceIds).toEqual([]);
  });

  it('calculates completeness deterministically from enterprise fields only', () => {
    const result =
      EnterpriseCommercialContextMapper.fromBrandBrain(makeBrain());

    // 8 mapped enterprise fields are present.
    // targetMarkets intentionally remains missing.
    expect(result.completenessScore).toBe(89);
  });

  it('does not mutate the source BrandBrain', () => {
    const input = makeBrain();
    const before = JSON.stringify(input);

    EnterpriseCommercialContextMapper.fromBrandBrain(input);

    expect(JSON.stringify(input)).toBe(before);
  });

  it('produces deterministic output for the same source state', () => {
    const input = makeBrain();

    const first =
      EnterpriseCommercialContextMapper.fromBrandBrain(input);

    const second =
      EnterpriseCommercialContextMapper.fromBrandBrain(input);

    expect(second).toEqual(first);
  });

  it('never copies BrandBrain products or campaign audience into enterprise-only fields', () => {
    const result =
      EnterpriseCommercialContextMapper.fromBrandBrain(makeBrain());

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('Aura HCM');
    expect(result.targetMarkets.value).toBeNull();
    expect(result.targetMarkets.status).toBe('missing');
  });
});
