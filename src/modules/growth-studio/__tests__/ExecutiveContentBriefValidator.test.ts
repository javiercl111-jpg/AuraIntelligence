import { describe, it, expect } from 'vitest';
import { calculateBriefReadiness } from '../services/ExecutiveContentBriefValidator';
import type { ExecutiveContentBrief } from '../types/executiveContentBrief';
import type { ContentPlan, ContentAsset } from '../types/contentPlan';

describe('ExecutiveContentBriefValidator', () => {
  const baseBrief: ExecutiveContentBrief = {
    id: 'test',
    conversationId: 'test',
    contentPlanId: 'test',
    selectedAssetId: 'asset-1',
    status: 'draft',
    schemaVersion: '1.0',
    createdAt: '',
    updatedAt: '',
    selectedAsset: { assetId: 'asset-1', title: 'Test Asset' },
    assetPurpose: { value: 'Test purpose', status: 'confirmed', source: '' },
    businessContext: { value: 'Context', status: 'confirmed', source: '' },
    targetAudience: { value: 'Audience', status: 'confirmed', source: '' },
    executiveIntent: { value: 'conversion', status: 'confirmed', source: '' },
    coreMessage: { value: 'Message', status: 'confirmed', source: '' },
    brandGuidelines: { value: ['Rule 1'], status: 'confirmed', source: '' },
    tone: { value: 'Professional', status: 'confirmed', source: '' },
    distributionTargets: { value: ['Web'], status: 'confirmed', source: '' },
    briefGoal: { value: '', status: 'confirmed', source: '' },
    originArtifacts: [],
    supportingEvidence: [
      { artifactType: 'T', artifactId: '1', field: 'f', value: 'v', source: 's', evidence: 'e', status: 'confirmed' }
    ],
    constraints: [
      { id: 'c1', type: 'business', description: 'desc', source: 'src', status: 'confirmed' }
    ],
    successCriteria: [
      { id: 'sc1', description: 'desc', isVerifiable: true, status: 'confirmed' }
    ],
    acceptanceChecklist: [],
    briefReadiness: 0,
    briefReadinessReason: '',
    isBlocked: false,
    blockingReasons: [],
    nextGenerationAction: { action: 'review_brief', assetId: 'asset-1', label: '', isEnabled: true }
  };

  const basePlan = {
    id: 'plan-1',
    conversationId: 'test',
    status: 'draft',
    schemaVersion: '1.0',
    createdAt: '',
    updatedAt: '',
    contentObjectives: { value: [], status: 'confirmed', source: '' },
    productionPriorities: { value: [], status: 'confirmed', source: '' },
    contentAssets: [
      {
        id: 'asset-1',
        title: 'Test Asset',
        purpose: 'Test',
        priority: 'high',
        phase: 'ready',
        audience: { value: '', status: 'confirmed', source: '' },
        distributionTargets: { value: [], status: 'confirmed', source: '' },
        dependencyIds: []
      } as unknown as ContentAsset
    ],
    nextRecommendedAsset: null,
    assetPipeline: { nodes: [], edges: [] },
    contentReadiness: 100,
    isBlocked: false
  } as unknown as ContentPlan;

  it('debe calcular readiness 100 si todos los campos están confirmed', () => {
    const result = calculateBriefReadiness(baseBrief, basePlan);
    expect(result.score).toBe(100);
    expect(result.isBlocked).toBe(false);
  });

  it('debe aplicar multiplicador 0.4 a campos inferred', () => {
    const brief = {
      ...baseBrief,
      coreMessage: { value: 'Message', status: 'inferred' as const, source: '' }
    };
    const result = calculateBriefReadiness(brief, basePlan);
    expect(result.score).toBe(88); // 100 - 20 + (20 * 0.4) = 88
    expect(result.isBlocked).toBe(false);
  });

  it('debe devolver score 0 y blocker si no hay selectedAsset', () => {
    const brief = { ...baseBrief, selectedAsset: null };
    const result = calculateBriefReadiness(brief, basePlan);
    expect(result.score).toBe(0);
    expect(result.isBlocked).toBe(true);
    expect(result.blockingReasons.some(r => r.id === 'no-asset')).toBe(true);
  });

  it('debe devolver score 0 y blocker si el asset no está en el ContentPlan', () => {
    const brief = { ...baseBrief, selectedAsset: { assetId: 'unknown', title: 'X' } };
    const result = calculateBriefReadiness(brief, basePlan);
    expect(result.score).toBe(0);
    expect(result.isBlocked).toBe(true);
    expect(result.blockingReasons.some(r => r.id === 'invalid-asset')).toBe(true);
  });

  it('debe bloquear si falta coreMessage', () => {
    const brief = {
      ...baseBrief,
      coreMessage: { value: '', status: 'missing' as const, source: '' }
    };
    const result = calculateBriefReadiness(brief, basePlan);
    expect(result.isBlocked).toBe(true);
    expect(result.blockingReasons.some(r => r.id === 'msg-missing')).toBe(true);
  });
});
