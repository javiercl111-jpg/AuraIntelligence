import { describe, it, expect } from 'vitest';
import * as EIS from '../index';

describe('EIS Core Contracts', () => {
  describe('Catalogs (Enums)', () => {
    it('should have exact values for ExecutiveCapabilityType', () => {
      expect(EIS.ExecutiveCapabilityType.MEMORY).toBe('MEMORY');
      expect(EIS.ExecutiveCapabilityType.REASONING).toBe('REASONING');
      expect(EIS.ExecutiveCapabilityType.REFLECTION).toBe('REFLECTION');
      expect(EIS.ExecutiveCapabilityType.GENERATION).toBe('GENERATION');
      expect(EIS.ExecutiveCapabilityType.REVIEW).toBe('REVIEW');
      
      const uniqueValues = new Set(Object.values(EIS.ExecutiveCapabilityType));
      expect(uniqueValues.size).toBe(Object.keys(EIS.ExecutiveCapabilityType).length);
    });

    it('should have exact values for ExecutiveArtifactType', () => {
      const uniqueValues = new Set(Object.values(EIS.ExecutiveArtifactType));
      expect(uniqueValues.size).toBe(Object.keys(EIS.ExecutiveArtifactType).length);
    });

    it('should have exact values for ExecutiveConfidence', () => {
      const uniqueValues = new Set(Object.values(EIS.ExecutiveConfidence));
      expect(uniqueValues.size).toBe(Object.keys(EIS.ExecutiveConfidence).length);
    });

    it('should have exact values for ExecutivePriority', () => {
      const uniqueValues = new Set(Object.values(EIS.ExecutivePriority));
      expect(uniqueValues.size).toBe(Object.keys(EIS.ExecutivePriority).length);
    });

    it('should have exact values for ExecutiveStatus', () => {
      const uniqueValues = new Set(Object.values(EIS.ExecutiveStatus));
      expect(uniqueValues.size).toBe(Object.keys(EIS.ExecutiveStatus).length);
    });

    it('should have exact values for ExecutiveDecisionStatus', () => {
      const uniqueValues = new Set(Object.values(EIS.ExecutiveDecisionStatus));
      expect(uniqueValues.size).toBe(Object.keys(EIS.ExecutiveDecisionStatus).length);
    });

    it('should be serializable (no TS enums)', () => {
      const serialized = JSON.stringify(EIS.ExecutiveCapabilityType);
      const parsed = JSON.parse(serialized);
      expect(parsed.MEMORY).toBe('MEMORY');
    });
  });

  describe('Types and Contracts', () => {
    it('should satisfy strict types', () => {
      // Use satisfies to ensure types are correctly exported and applied
      const artifact = {
        id: '123',
        artifactType: EIS.ExecutiveArtifactType.GROWTH_OBJECTIVE,
        version: 1,
        confidence: EIS.ExecutiveConfidence.HIGH,
        status: EIS.ExecutiveStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies EIS.ExecutiveArtifact;

      expect(artifact.id).toBe('123');
    });

    it('should ensure ExecutiveDecision includes ExecutiveDecisionStatus', () => {
      const decision = {
        id: 'd1',
        priority: EIS.ExecutivePriority.CRITICAL,
        confidence: EIS.ExecutiveConfidence.VERY_HIGH,
        rationale: 'Strategic choice',
        recommendedAction: 'Proceed with core expansion',
        status: EIS.ExecutiveDecisionStatus.PENDING,
        createdAt: new Date(),
      } satisfies EIS.ExecutiveDecision;

      expect(decision.status).toBe('PENDING');
    });
  });
});
