import { describe, it, expect } from 'vitest';
import { BrandBrainBuilder } from '../services/BrandBrainBuilder';
import type { GrowthStructuredContext } from '../types/growthConversation';

describe('BrandBrainBuilder', () => {
  const mockContext: GrowthStructuredContext = {
    objective: 'Vender producto',
    productOrService: 'Aura HCM',
    audience: 'Hoteles',
    region: 'México',
    expectedResult: 'Aumentar ventas 20%',
    additionalData: {}
  };

  it('debe construir un Brand Brain básico a partir del contexto con valores missing por defecto', () => {
    const bb = BrandBrainBuilder.buildFromContext(mockContext);

    // Extracted from Growth Objective
    expect(bb.products.value).toEqual(['Aura HCM']);
    expect(bb.products.status).toBe('inferred');

    expect(bb.targetAudience.value).toBe('Hoteles');
    expect(bb.targetAudience.status).toBe('inferred');

    expect(bb.businessGoals.value).toEqual(['Aumentar ventas 20%']);
    expect(bb.businessGoals.status).toBe('inferred');

    // Missing fields
    expect(bb.industry.status).toBe('missing');
    expect(bb.valueProposition.status).toBe('missing');
    expect(bb.differentiators.status).toBe('missing');
  });

  it('debe calcular el confidenceScore correctamente (inferred y missing)', () => {
    const bb = BrandBrainBuilder.buildFromContext(mockContext);

    // Weights:
    // products: 15 * 0.4 = 6
    // targetAudience: 15 * 0.4 = 6
    // businessGoals: 5 * 0.4 = 2
    // total = 14
    expect(bb.confidenceScore).toBe(14);
  });

  it('debe permitir confirmaciones explícitas de campos', () => {
    const initialBb = BrandBrainBuilder.buildFromContext(mockContext);

    // Ahora simulamos que el usuario confirma 'products' y 'targetAudience'
    const confirmations = {
      products: true,
      targetAudience: true
    };

    const updatedBb = BrandBrainBuilder.buildFromContext(mockContext, initialBb, confirmations);

    expect(updatedBb.products.status).toBe('confirmed');
    expect(updatedBb.targetAudience.status).toBe('confirmed');
    // industry was missing, so even if confirmed, it shouldn't become confirmed because it has no value
    expect(updatedBb.industry.status).toBe('missing');

    // Recalculate score
    // products: 15 * 1 = 15
    // targetAudience: 15 * 1 = 15
    // businessGoals: 5 * 0.4 = 2
    // total = 32
    expect(updatedBb.confidenceScore).toBe(32);
  });

  it('debe incorporar correcciones desde additionalData y marcarlas con evidencia', () => {
    const ctxWithCorrection: GrowthStructuredContext = {
      ...mockContext,
      additionalData: {
        industry: 'Software B2B',
        valueProposition: 'Mejor software de RH'
      }
    };

    const bb = BrandBrainBuilder.buildFromContext(ctxWithCorrection);

    expect(bb.industry.value).toBe('Software B2B');
    expect(bb.industry.status).toBe('inferred'); // it is inferred first unless explicitly confirmed
    expect(bb.industry.source).toBe('user_correction');

    expect(bb.valueProposition.value).toBe('Mejor software de RH');
    expect(bb.valueProposition.status).toBe('inferred');
  });

  it('debe extraer knownFacts y missingKnowledge correctamente', () => {
    const bb = BrandBrainBuilder.buildFromContext(mockContext);

    const knownFields = bb.knownFacts.map(f => f.field);
    expect(knownFields).toContain('products');
    expect(knownFields).toContain('targetAudience');
    expect(knownFields).toContain('businessGoals');
    expect(knownFields).not.toContain('industry');

    const missingFields = bb.missingKnowledge.map(f => f.field);
    expect(missingFields).toContain('industry');
    expect(missingFields).toContain('valueProposition');
  });

  it('debe mantener industry, valueProposition y differentiators en missing sin evidencia', () => {
    const bb = BrandBrainBuilder.buildFromContext(mockContext);
    expect(bb.industry.status).toBe('missing');
    expect(bb.industry.value).toBeNull();
    expect(bb.valueProposition.status).toBe('missing');
    expect(bb.valueProposition.value).toBeNull();
    expect(bb.differentiators.status).toBe('missing');
    expect(bb.differentiators.value).toBeNull();
  });

  it('debe evitar que un campo missing cambie a confirmed (missing nunca cambia a confirmed)', () => {
    const initialBb = BrandBrainBuilder.buildFromContext(mockContext);
    // Confirmamos industry que es missing
    const confirmations = {
      industry: true
    };
    const updatedBb = BrandBrainBuilder.buildFromContext(mockContext, initialBb, confirmations);
    expect(updatedBb.industry.status).toBe('missing'); // Sigue missing porque no tiene evidencia/valor
  });

  it('debe permitir confirmación solo en campos visibles, no missing y con evidencia', () => {
    const ctxWithEvidence: GrowthStructuredContext = {
      ...mockContext,
      additionalData: {
        industry: 'Software B2B'
      }
    };
    // Primero se construye como inferred
    const initialBb = BrandBrainBuilder.buildFromContext(ctxWithEvidence);
    expect(initialBb.industry.status).toBe('inferred');
    expect(initialBb.industry.value).toBe('Software B2B');

    // Confirmación del campo con evidencia
    const confirmations = {
      industry: true,
      valueProposition: true // no tiene evidencia (es missing)
    };
    const updatedBb = BrandBrainBuilder.buildFromContext(ctxWithEvidence, initialBb, confirmations);
    expect(updatedBb.industry.status).toBe('confirmed');
    expect(updatedBb.valueProposition.status).toBe('missing'); // Sigue missing porque no tenía evidencia
  });

  it('debe reconstruir Brand Brain y recalcular confidenceScore tras una corrección', () => {
    const initialBb = BrandBrainBuilder.buildFromContext(mockContext);
    expect(initialBb.confidenceScore).toBe(14);

    const ctxWithCorrection: GrowthStructuredContext = {
      ...mockContext,
      additionalData: {
        industry: 'Software B2B'
      }
    };

    const updatedBb = BrandBrainBuilder.buildFromContext(ctxWithCorrection, initialBb);
    expect(updatedBb.industry.value).toBe('Software B2B');
    expect(updatedBb.industry.status).toBe('inferred');
    // Score inicial era 14
    // Nuevo score: products (15 * 0.4 = 6) + targetAudience (15 * 0.4 = 6) + businessGoals (5 * 0.4 = 2) + industry (15 * 0.4 = 6) = 20
    expect(updatedBb.confidenceScore).toBe(20);
  });

  it('debe representar productos como conocimiento parcial extraído del objetivo de crecimiento', () => {
    const bb = BrandBrainBuilder.buildFromContext(mockContext);
    expect(bb.products.value).toEqual(['Aura HCM']);
    expect(bb.products.status).toBe('inferred');
    expect(bb.products.source).toBe('growth_objective');
    expect(bb.products.evidence).toBe('Extraído del objetivo de crecimiento: Aura HCM');
  });
});
