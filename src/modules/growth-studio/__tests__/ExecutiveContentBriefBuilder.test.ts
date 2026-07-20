import { describe, it, expect } from 'vitest';
import { ExecutiveContentBriefBuilder } from '../services/ExecutiveContentBriefBuilder';
import type { ContentPlan, ContentAsset } from '../types/contentPlan';

describe('ExecutiveContentBriefBuilder', () => {
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
        audience: { value: 'Audience', status: 'confirmed', source: '' },
        distributionTargets: { value: ['Web'], status: 'confirmed', source: '' },
        dependencyIds: []
      } as unknown as ContentAsset
    ],
    nextRecommendedAsset: {
      id: 'asset-1',
      title: 'Test Asset',
      purpose: 'Test',
      priority: 'high',
      phase: 'ready',
      audience: { value: 'Audience', status: 'confirmed', source: '' },
      distributionTargets: { value: ['Web'], status: 'confirmed', source: '' },
      dependencyIds: []
    } as unknown as ContentAsset,
    assetPipeline: { nodes: [], edges: [] },
    contentReadiness: 100,
    isBlocked: false
  } as unknown as ContentPlan;

  it('debe construir un brief con el nextRecommendedAsset por defecto', () => {
    const brief = ExecutiveContentBriefBuilder.build(null, null, null, null, basePlan, 'conv-1');
    expect(brief.selectedAssetId).toBe('asset-1');
    expect(brief.selectedAsset?.title).toBe('Test Asset');
    expect(brief.contentPlanId).toBe('plan-1');
  });

  it('debe construir un brief con explicitAssetId si se proporciona', () => {
    const brief = ExecutiveContentBriefBuilder.build(null, null, null, null, basePlan, 'conv-1', 'asset-1');
    expect(brief.selectedAssetId).toBe('asset-1');
  });

  it('debe incluir constraints institucionales siempre', () => {
    const brief = ExecutiveContentBriefBuilder.build(null, null, null, null, basePlan, 'conv-1');
    const govConstraints = brief.constraints.filter(c => c.source === 'aura_governance');
    expect(govConstraints.length).toBeGreaterThan(0);
  });

  it('la nextGenerationAction debe ser review_brief si el brief no está listo o aprobado', () => {
    const brief = ExecutiveContentBriefBuilder.build(null, null, null, null, basePlan, 'conv-1');
    // Como faltan coreMessage (viene de campaign strategy), score será < 100
    expect(brief.nextGenerationAction.action).toBe('review_brief');
  });

  it('debe reconstruir determinísticamente y ser idempotente', () => {
    const brief1 = ExecutiveContentBriefBuilder.build(null, null, null, null, basePlan, 'conv-1');
    const brief2 = ExecutiveContentBriefBuilder.build(null, null, null, null, basePlan, 'conv-1');

    // Ignoramos campos generados dinámicamente como id, createdAt, updatedAt
    const b1 = { ...brief1, id: '', createdAt: '', updatedAt: '' };
    const b2 = { ...brief2, id: '', createdAt: '', updatedAt: '' };

    expect(b1).toEqual(b2);
  });
});
