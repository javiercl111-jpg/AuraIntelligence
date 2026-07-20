import { describe, it, expect } from 'vitest';
import { BrandBrainValidator } from '../services/BrandBrainValidator';
import type { BrandBrain } from '../types/brandBrain';
import { BrandBrainBuilder } from '../services/BrandBrainBuilder';

describe('BrandBrainValidator', () => {
  it('no debe retornar errores para un Brand Brain válido', () => {
    const validBrain: BrandBrain = BrandBrainBuilder.buildFromContext({
      objective: 'Vender producto',
      productOrService: 'Aura HCM',
      audience: 'Hoteles',
      region: 'México',
      expectedResult: 'Aumentar ventas 20%'
    });

    const errors = BrandBrainValidator.validate(validBrain);
    expect(errors.length).toBe(0);
  });

  it('debe detectar score fuera de rango', () => {
    const invalidBrain = {
      confidenceScore: 150,
      knownFacts: [],
      missingKnowledge: [],
      companyProfile: { companyName: { status: 'missing', value: null } },
      industry: { status: 'missing', value: null }
    } as unknown as BrandBrain;

    const errors = BrandBrainValidator.validate(invalidBrain);
    expect(errors).toContain('confidenceScore debe estar entre 0 y 100.');
  });

  it('debe detectar campos missing con valor', () => {
    const invalidBrain = {
      confidenceScore: 50,
      knownFacts: [],
      missingKnowledge: [{ field: 'industry', label: 'Industria', importance: 'high' }],
      industry: { status: 'missing', value: 'Software' } // ERROR
    } as unknown as BrandBrain;

    const errors = BrandBrainValidator.validate(invalidBrain);
    expect(errors.some(e => e.includes("El campo missing 'industry' no debe contener valor"))).toBe(true);
  });

  it('debe detectar campos confirmed sin source ni evidencia', () => {
    const invalidBrain = {
      confidenceScore: 50,
      knownFacts: [{ field: 'industry', status: 'confirmed', value: 'Software' }],
      missingKnowledge: [],
      industry: { status: 'confirmed', value: 'Software', source: undefined, evidence: undefined } // ERROR
    } as unknown as BrandBrain;

    const errors = BrandBrainValidator.validate(invalidBrain);
    expect(errors.some(e => e.includes("El campo confirmed 'industry' debe tener source o evidence"))).toBe(true);
  });
});
