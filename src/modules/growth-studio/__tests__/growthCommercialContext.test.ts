import { describe, expect, it } from 'vitest';

import {
  GROWTH_COMMERCIAL_CONTEXT_THRESHOLDS,
  type GrowthCommercialContextRefs,
  type ProductContext,
} from '../types/growthCommercialContext';

const field = <T>(
  value: T | null,
  status: 'confirmed' | 'inferred' | 'missing',
) => ({
  value,
  status,
  confidence:
    status === 'confirmed'
      ? 1
      : status === 'inferred'
        ? 0.6
        : 0,
  evidenceIds: [],
});

describe('Growth commercial context', () => {
  it('models product context independently', () => {
    const product: ProductContext = {
      id: 'product-aura-hcm',
      tenantId: 'tenant-aura',
      companyId: 'company-aura',

      name: field('Aura HCM', 'confirmed'),
      category: field('Human Capital Management', 'confirmed'),
      description: field(
        'Solución empresarial para la gestión de capital humano.',
        'confirmed',
      ),

      problemsSolved: field(
        ['Gestión fragmentada de personal'],
        'confirmed',
      ),
      capabilities: field(
        ['Gestión de personal', 'Asistencia'],
        'confirmed',
      ),
      benefits: field(
        ['Mayor visibilidad operativa'],
        'confirmed',
      ),
      differentiators: field(
        ['Integración con el ecosistema Aura'],
        'confirmed',
      ),

      idealCustomerProfiles: field(
        ['Empresas con operación intensiva de personal'],
        'inferred',
      ),
      targetIndustries: field(
        ['Hotelería'],
        'inferred',
      ),
      useCases: field(
        ['Administración de personal'],
        'confirmed',
      ),

      pricingContext: field(null, 'missing'),
      commercialEvidence: field([], 'missing'),
      claimsRestrictions: field([], 'missing'),
      preferredMessages: field([], 'missing'),
      websiteUrl: field(null, 'missing'),

      evidence: [],
      status: 'draft',
      completenessScore: 72,
      version: 1,
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
    };

    expect(product.name.value).toBe('Aura HCM');
    expect(product.companyId).toBe('company-aura');
  });

  it('references external prospect authority without embedding DENUE', () => {
    const refs: GrowthCommercialContextRefs = {
      enterprise: {
        contextId: 'enterprise-aura',
        version: 1,
      },
      product: {
        productContextId: 'product-aura-hcm',
        version: 1,
      },
      prospect: {
        prospectId: 'prospect-001',
        sourceAuthority: 'control_center',
      },
    };

    expect(refs.prospect?.sourceAuthority).toBe('control_center');
    expect(JSON.stringify(refs).toLowerCase()).not.toContain('denue');
  });

  it('requires higher quality for outreach than strategy', () => {
    expect(
      GROWTH_COMMERCIAL_CONTEXT_THRESHOLDS.PRODUCT_OUTREACH_READY,
    ).toBeGreaterThan(
      GROWTH_COMMERCIAL_CONTEXT_THRESHOLDS.PRODUCT_STRATEGY_READY,
    );
  });
});
