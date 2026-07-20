import { describe, it, expect } from 'vitest';
import { ContentPlanBuilder } from '../services/ContentPlanBuilder';
import type { CampaignStrategy } from '../types/campaignStrategy';
import type { GrowthObjective } from '../types/growthObjective';

describe('ContentPlanBuilder', () => {
  const mockObjective = {
    id: 'obj-1',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    goal: 'Aumentar ventas',
    constraints: []
  } as unknown as GrowthObjective;

  const mockStrategy = {
    id: 'strat-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    campaignObjective: { value: 'Obj Strat', status: 'confirmed' },
    primaryAudience: { value: 'Aud', status: 'confirmed' },
    coreMessage: { value: 'Msg', status: 'confirmed' },
    recommendedChannels: { value: ['Web', 'Email'], status: 'confirmed' },
    recommendedContentTypes: { value: ['Landing', 'Video'], status: 'confirmed' },
    callsToAction: { value: ['Comprar'], status: 'confirmed' },
    executionConstraints: { budget: 1000, timeframe: '1m', resources: [] },
    strategyRisks: [],
    strategyReadinessReason: ''
  } as unknown as CampaignStrategy;

  it('builds a linear DAG (AssetPipeline) for recommendedContentTypes', () => {
    const plan = ContentPlanBuilder.build(mockObjective, null, mockStrategy, null, 'conv-1');
    expect(plan.assetPipeline.nodes).toHaveLength(2);
    expect(plan.assetPipeline.edges).toHaveLength(1);

    const landingAsset = plan.contentAssets.find(a => a.title === 'Landing');
    const videoAsset = plan.contentAssets.find(a => a.title === 'Video');

    expect(landingAsset?.children).toContain(videoAsset?.id);
    expect(videoAsset?.parents).toContain(landingAsset?.id);
  });

  it('sets purpose and originArtifact accurately', () => {
    const plan = ContentPlanBuilder.build(mockObjective, null, mockStrategy, null, 'conv-1');
    const asset = plan.contentAssets[0];

    expect(asset.originArtifact).toBe('CampaignStrategy');
    expect(asset.purpose).toContain('Landing');
    expect(asset.distributionTargets.value).toEqual(['Web', 'Email']);
  });

  it('does not hallucinate assets if recommendedContentTypes is empty', () => {
    const emptyStrategy = { ...mockStrategy, recommendedContentTypes: { value: [], status: 'missing' as const } };
    const plan = ContentPlanBuilder.build(mockObjective, null, emptyStrategy, null, 'conv-1');

    expect(plan.contentAssets).toHaveLength(0);
    expect(plan.assetPipeline.nodes).toHaveLength(0);
  });

  it('recommends the asset with executive priority (first available with no parents)', () => {
    const plan = ContentPlanBuilder.build(mockObjective, null, mockStrategy, null, 'conv-1');
    const next = plan.nextRecommendedAsset;

    expect(next).not.toBeNull();
    // Landing is first in DAG (parents = 0) and highest priority
    expect(next?.title).toBe('Landing');
  });
});
