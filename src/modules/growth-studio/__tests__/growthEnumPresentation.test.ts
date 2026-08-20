import { describe, expect, it } from 'vitest';
import {
  presentGrowthEnum,
  type GrowthEnumPresentationMessages,
} from '../i18n/growthEnumPresentation';

const esMessages: GrowthEnumPresentationMessages = {
  statusConfirmed: 'Confirmado',
  statusInferred: 'Inferido',
  statusMissing: 'Faltante',
  statusApproved: 'Aprobado',
  statusReviewRequired: 'Revisión requerida',
  statusDraft: 'Borrador',
  statusCompleted: 'Completado',

  priorityCritical: 'Crítica',
  priorityHigh: 'Alta',
  priorityMedium: 'Media',
  priorityLow: 'Baja',

  severityCritical: 'Crítica',
  severityHigh: 'Alta',
  severityMedium: 'Media',
  severityLow: 'Baja',

  impactHigh: 'Alto',
  impactMedium: 'Medio',
  impactLow: 'Bajo',

  confidenceHigh: 'Alta',
  confidenceMedium: 'Media',
  confidenceLow: 'Baja',

  mitigationPlanned: 'Planificada',
  mitigationActive: 'Activa',
  mitigationUnmitigated: 'Sin mitigar',

  criticalityBlocker: 'Bloqueante',
  criticalityHigh: 'Alta',
  criticalityMedium: 'Media',
  criticalityLow: 'Baja',

  unknown: 'Desconocido',
};

describe('presentGrowthEnum', () => {
  it('presents status without changing the canonical input', () => {
    const canonical = 'confirmed';

    expect(
      presentGrowthEnum(
        'status',
        canonical,
        esMessages,
      ),
    ).toBe('Confirmado');

    expect(canonical).toBe('confirmed');
  });

  it('presents priorities', () => {
    expect(
      presentGrowthEnum(
        'priority',
        'critical',
        esMessages,
      ),
    ).toBe('Crítica');

    expect(
      presentGrowthEnum(
        'priority',
        'high',
        esMessages,
      ),
    ).toBe('Alta');
  });

  it('presents severity and impact independently', () => {
    expect(
      presentGrowthEnum(
        'severity',
        'critical',
        esMessages,
      ),
    ).toBe('Crítica');

    expect(
      presentGrowthEnum(
        'impact',
        'high',
        esMessages,
      ),
    ).toBe('Alto');
  });

  it('presents mitigation and criticality', () => {
    expect(
      presentGrowthEnum(
        'mitigation',
        'unmitigated',
        esMessages,
      ),
    ).toBe('Sin mitigar');

    expect(
      presentGrowthEnum(
        'criticality',
        'blocker',
        esMessages,
      ),
    ).toBe('Bloqueante');
  });

  it('fails closed for unsupported values', () => {
    expect(
      presentGrowthEnum(
        'status',
        'unexpected_value',
        esMessages,
      ),
    ).toBe('Desconocido');

    expect(
      presentGrowthEnum(
        'priority',
        undefined,
        esMessages,
      ),
    ).toBe('Desconocido');
  });
});
