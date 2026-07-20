import { describe, it, expect } from 'vitest';
import { calculateContentReadiness } from '../services/ContentPlanValidator';
import type { ContentPlan } from '../types/contentPlan';

describe('ContentPlanValidator', () => {
  const getBasePlan = (): ContentPlan => ({
    id: 'test-1',
    conversationId: 'conv-1',
    status: 'draft',
    schemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contentObjectives: { value: ['Test Obj'], status: 'confirmed' },
    productionPriorities: { value: ['Test Prio'], status: 'confirmed' },
    contentAssets: [],
    knownAssets: [
      {
        id: 'asset-1',
        title: 'Landing',
        objective: { value: 'Obj', status: 'confirmed' },
        audience: { value: 'Aud', status: 'confirmed' },
        phase: 'not_started',
        priority: 'high',
        distributionTargets: { value: ['Web'], status: 'confirmed' },
        dependencyIds: [],
        status: 'confirmed',
        purpose: 'Test',
        originArtifact: 'CampaignStrategy',
        parents: [],
        children: []
      }
    ],
    missingAssets: [],
    assetDependencies: [],
    assetPipeline: { nodes: ['asset-1'], edges: [] },
    productionInputs: [
      { id: '1', type: 'message', value: 'Msg', status: 'confirmed', isReady: true, description: '' }
    ],
    contentRisks: [],
    contentReadiness: 0,
    contentReadinessReason: '',
    isBlocked: false,
    nextRecommendedAsset: null
  });

  it('calculates 100% readiness for a fully confirmed plan', () => {
    const plan = getBasePlan();
    const result = calculateContentReadiness(plan);
    expect(result.score).toBe(100);
    expect(result.isBlocked).toBe(false);
  });

  it('calculates partial readiness for inferred fields', () => {
    const plan = getBasePlan();
    plan.contentObjectives.status = 'inferred';
    const result = calculateContentReadiness(plan);
    // 100 - 25 + (25 * 0.4) = 75 + 10 = 85
    expect(result.score).toBe(85);
  });

  it('returns score > 0 even if isBlocked is true (decoupling)', () => {
    const plan = getBasePlan();
    plan.isBlocked = true;
    const result = calculateContentReadiness(plan);
    expect(result.score).toBe(100);
    expect(result.isBlocked).toBe(true);
  });

  it('drops to 0 if contentObjectives is missing or no knownAssets exist', () => {
    const plan = getBasePlan();
    plan.knownAssets = [];
    const result = calculateContentReadiness(plan);
    expect(result.score).toBe(0);
  });
});
