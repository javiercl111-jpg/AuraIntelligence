import { describe, expect, it } from 'vitest';
import * as EIS from '../../index';
import * as Discovery from '../index';
import { createValidDiagnosis, createValidRequest } from './fixtures/executiveDiscoveryFixtures';

const catalogs = [
  Discovery.DiscoveryEvidenceSourceType,
  Discovery.DiscoveryEvidenceClassification,
  Discovery.ExecutiveRiskSeverity,
  Discovery.ExecutiveRiskLikelihood,
  Discovery.ExecutiveOpportunityHorizon,
  Discovery.ExecutiveActionStatus,
  Discovery.ExecutiveDiagnosisStatus,
  Discovery.ExecutiveMaturityLevel,
  Discovery.ExecutiveConfidenceLevel,
];

function containsDate(value: unknown, visited = new Set<object>()): boolean {
  if (value instanceof Date) return true;
  if (value === null || typeof value !== 'object') return false;
  if (visited.has(value)) return false;
  visited.add(value);
  return Object.values(value).some((entry) => containsDate(entry, visited));
}

describe('Executive Discovery contracts', () => {
  it('exports the discovery foundation through named barrels', () => {
    expect(EIS.ExecutiveDiscovery.ExecutiveDiagnosisStatus.PARTIAL).toBe('PARTIAL');
    expect(typeof Discovery.ExecutiveDiscoveryCapability).toBe('function');
    expect(typeof Discovery.validateExecutiveDiscoveryRequest).toBe('function');
  });

  it('extends the stable EIS catalogs without removing existing values', () => {
    expect(EIS.ExecutiveCapabilityType.EXECUTIVE_DISCOVERY).toBe('EXECUTIVE_DISCOVERY');
    expect(EIS.ExecutiveArtifactType.EXECUTIVE_DIAGNOSIS).toBe('EXECUTIVE_DIAGNOSIS');
    expect(EIS.ExecutiveCapabilityType.MEMORY).toBe('MEMORY');
    expect(EIS.ExecutiveArtifactType.GROWTH_OBJECTIVE).toBe('GROWTH_OBJECTIVE');
  });

  it('keeps every discovery catalog unique and JSON serializable', () => {
    catalogs.forEach((catalog) => {
      const values = Object.values(catalog);
      expect(new Set(values).size).toBe(values.length);
      expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalog);
    });
  });

  it('uses ISO strings rather than Date objects in discovery DTOs', () => {
    const request = createValidRequest();
    const diagnosis = createValidDiagnosis(request);
    expect(containsDate(request)).toBe(false);
    expect(containsDate(diagnosis)).toBe(false);
    expect(typeof request.requestedAt).toBe('string');
    expect(typeof diagnosis.generatedAt).toBe('string');
  });
});
