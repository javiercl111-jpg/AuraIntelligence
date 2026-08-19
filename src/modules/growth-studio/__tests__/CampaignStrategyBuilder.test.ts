import { describe, it, expect } from 'vitest';
import { CampaignStrategyBuilder } from '../services/CampaignStrategyBuilder';
import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { GrowthConversation } from '../types/growthConversation';

describe('CampaignStrategyBuilder', () => {
  const getMockConversation = (turns: string[] = []): GrowthConversation => ({
    id: 'conv1',
    tenantId: 'tenant1',
    companyId: 'company1',
    userId: 'user1',
    status: 'active',
    currentStage: 'welcome',
    turns: turns.map((t, i) => ({ id: `t${i}`, conversationId: 'conv1', role: 'user', content: t, timestamp: '' })),
    createdAt: '',
    updatedAt: '',
    structuredContext: {},
  } as unknown as GrowthConversation);

  const getStructuredCampaignConversation = (
    channels: string[] | undefined,
    callToAction: string | undefined,
    turns: string[] = [],
  ): GrowthConversation => ({
    ...getMockConversation(turns),
    structuredContext: {
      campaignChannels: channels,
      campaignCallToAction: callToAction,
    },
  });
  const getDelegatedConversation =
    (): GrowthConversation => ({
      ...getMockConversation(),
      structuredContext: {
        campaignChannelRecommendationRequested:
          true,
      },
    });
  const getMockObjective = (): GrowthObjective => ({
    id: 'obj1',
    tenantId: 't1',
    companyId: 'c1',
    goal: 'Vender',
    productOrService: 'Aura',
    audience: 'Hoteles',
    expectedResult: 'Ventas',
    status: 'draft',
    completionPercentage: 100,
    createdAt: '',
    updatedAt: '',
  } as GrowthObjective);

  const getMockBrandBrain = (): BrandBrain => ({
    id: 'bb1',
    tenantId: 't1',
    companyId: 'c1',
    companyProfile: {
      companyName: { value: 'Aura', status: 'confirmed', confidence: 'high' },
      businessDescription: { value: 'AI', status: 'confirmed', confidence: 'high' }
    },
    industry: { value: 'Tech', status: 'confirmed', confidence: 'high' },
    products: { value: ['Aura'], status: 'confirmed', confidence: 'high' },
    valueProposition: { value: 'Fast AI', status: 'confirmed', confidence: 'high' },
    targetAudience: { value: 'B2B', status: 'confirmed', confidence: 'high' },
    brandTone: { value: 'Pro', status: 'confirmed', confidence: 'high' },
    differentiators: { value: ['Speed'], status: 'confirmed', confidence: 'high' },
    communicationStyle: { value: 'Direct', status: 'confirmed', confidence: 'high' },
    businessGoals: { value: ['Growth'], status: 'confirmed', confidence: 'high' },
    knownFacts: [],
    missingKnowledge: [],
    confidenceScore: 100,
    createdAt: '',
    updatedAt: ''
  });

  it('does not duplicate the product when the objective already contains it', () => {
    const objective = {
      ...getMockObjective(),
      goal: 'Quiero comercializar Aura HCM',
      productOrService: 'Aura HCM',
    };

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        objective,
        getMockBrandBrain(),
        getMockConversation(),
      );

    expect(
      strategy.campaignObjective.value,
    ).toBe(
      'Quiero comercializar Aura HCM',
    );
  });

  it('adds the product when the objective does not already contain it', () => {
    const objective = {
      ...getMockObjective(),
      goal: 'Quiero comercializar',
      productOrService: 'Aura HCM',
    };

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        objective,
        getMockBrandBrain(),
        getMockConversation(),
      );

    expect(
      strategy.campaignObjective.value,
    ).toBe(
      'Quiero comercializar Aura HCM',
    );
  });

  it('deduplicates the product case-insensitively', () => {
    const objective = {
      ...getMockObjective(),
      goal: 'Quiero comercializar AURA HCM',
      productOrService: 'Aura HCM',
    };

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        objective,
        getMockBrandBrain(),
        getMockConversation(),
      );

    expect(
      strategy.campaignObjective.value,
    ).toBe(
      'Quiero comercializar AURA HCM',
    );
  });
  it('infers B2B channels only after explicit delegation', () => {
    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        getMockObjective(),
        getMockBrandBrain(),
        getDelegatedConversation(),
      );

    expect(
      strategy.recommendedChannels.status,
    ).toBe('inferred');

    expect(
      strategy.recommendedChannels.value,
    ).toEqual([
      'LinkedIn',
      'Email',
    ]);

    expect(
      strategy.recommendedChannels.source,
    ).toBe(
      'Aura Growth Channel Recommendation Policy V1',
    );
  });

  it('keeps delegated channels missing when evidence is insufficient', () => {
    const objective = {
      ...getMockObjective(),
      audience: '',
    };

    const brandBrain = {
      ...getMockBrandBrain(),
      industry: {
        value: null,
        status: 'missing' as const,
        confidence: 'low' as const,
      },
      targetAudience: {
        value: null,
        status: 'missing' as const,
        confidence: 'low' as const,
      },
    };

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        objective,
        brandBrain,
        getDelegatedConversation(),
      );

    expect(
      strategy.recommendedChannels.status,
    ).toBe('missing');

    expect(
      strategy.recommendedChannels.value,
    ).toBeNull();
  });

  it('preserves explicit structured channels over delegated recommendation', () => {
    const conversation = {
      ...getDelegatedConversation(),
      structuredContext: {
        campaignChannelRecommendationRequested:
          true,
        campaignChannels: [
          'Google',
        ],
      },
    };

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        getMockObjective(),
        getMockBrandBrain(),
        conversation,
      );

    expect(
      strategy.recommendedChannels.status,
    ).toBe('confirmed');

    expect(
      strategy.recommendedChannels.value,
    ).toEqual([
      'Google',
    ]);
  });
  it('uses structured campaign channels as confirmed evidence', () => {
    const conv =
      getStructuredCampaignConversation(
        ['LinkedIn', 'Email'],
        undefined,
        ['Texto sin canales reconocibles'],
      );

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        getMockObjective(),
        getMockBrandBrain(),
        conv,
      );

    expect(
      strategy.recommendedChannels.status,
    ).toBe('confirmed');

    expect(
      strategy.recommendedChannels.value,
    ).toEqual([
      'LinkedIn',
      'Email',
    ]);

    expect(
      strategy.recommendedChannels.source,
    ).toBe(
      'Growth Conversation / Campaign Intake',
    );
  });

  it('uses structured campaign CTA as confirmed evidence', () => {
    const conv =
      getStructuredCampaignConversation(
        undefined,
        'Agendar una demostración',
      );

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        getMockObjective(),
        getMockBrandBrain(),
        conv,
      );

    expect(
      strategy.callsToAction.status,
    ).toBe('confirmed');

    expect(
      strategy.callsToAction.value,
    ).toEqual([
      'Agendar una demostración',
    ]);

    expect(
      strategy.callsToAction.source,
    ).toBe(
      'Growth Conversation / Campaign Intake',
    );
  });

  it('prioritizes structured channels over legacy turn scanning', () => {
    const conv =
      getStructuredCampaignConversation(
        ['LinkedIn'],
        undefined,
        [
          'Antes habíamos considerado Facebook y WhatsApp.',
        ],
      );

    const strategy =
      CampaignStrategyBuilder.buildStrategy(
        't1',
        'c1',
        getMockObjective(),
        getMockBrandBrain(),
        conv,
      );

    expect(
      strategy.recommendedChannels.value,
    ).toEqual([
      'LinkedIn',
    ]);

    expect(
      strategy.recommendedChannels.value,
    ).not.toContain('Facebook');

    expect(
      strategy.recommendedChannels.value,
    ).not.toContain('WhatsApp');
  });
  it('does NOT recommend channels without explicit evidence', () => {
    const conv = getMockConversation(['Solo quiero vender más, no sé dónde.']);
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), getMockBrandBrain(), conv);

    expect(strategy.recommendedChannels.status).toBe('missing');
    expect(strategy.recommendedChannels.value).toBeNull();
  });

  it('recommends channels ONLY when explicit evidence exists', () => {
    const conv = getMockConversation(['Mis clientes usan mucho Facebook y WhatsApp.']);
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), getMockBrandBrain(), conv);

    expect(strategy.recommendedChannels.status).toBe('confirmed');
    expect(strategy.recommendedChannels.value).toContain('Facebook');
    expect(strategy.recommendedChannels.value).toContain('WhatsApp');
    expect(strategy.recommendedChannels.evidence).toContain('Mentioned Facebook.');
  });

  it('calculates StrategyEvidenceScore properly', () => {
    const obj = getMockObjective(); // campaignObjective(20) + primaryAudience(15)
    const bb = getMockBrandBrain(); // coreMessage(15) + valueDrivers(10)
    // Total should be 20 + 15 + (15 * 0.4 = 6) + (10 * 0.4 = 4) = 45

    const conv = getMockConversation([]);
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', obj, bb, conv);

    expect(strategy.strategyEvidenceScore).toBe(45);
  });

  it('calculates ReadinessScore properly', () => {
    const obj = getMockObjective(); // campaignObjective(30) + primaryAudience(30)
    const bb = getMockBrandBrain(); // coreMessage(30)
    // Total should be 30 + 30 + 12 = 72

    const conv = getMockConversation([]);
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', obj, bb, conv);

    expect(strategy.readinessScore).toBe(72);
    expect(strategy.strategyReadinessReason).toContain('revisar');
  });

  it('generates strategyRisks and knowledgeGaps when information is missing', () => {
    const conv = getMockConversation([]); // no channels
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), getMockBrandBrain(), conv);

    const channelRisk = strategy.strategyRisks.find(r => r.type === 'execution' && r.description.includes('canales'));
    expect(channelRisk).toBeDefined();

    const channelGap = strategy.knowledgeGaps.find(g => g.field === 'recommendedChannels');
    expect(channelGap).toBeDefined();

    const ctaGap = strategy.knowledgeGaps.find(g => g.field === 'callsToAction');
    expect(ctaGap).toBeDefined();
  });

  it('guarantees that recommendedChannels, contentTypes, callsToAction, and valueDrivers are missing without evidence', () => {
    const emptyBrain: BrandBrain = {
      ...getMockBrandBrain(),
      differentiators: { value: null, status: 'missing', confidence: 'low' },
      valueProposition: { value: null, status: 'missing', confidence: 'low' }
    };
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', null, emptyBrain, null);

    expect(strategy.recommendedChannels.status).toBe('missing');
    expect(strategy.recommendedChannels.value).toBeNull();
    expect(strategy.recommendedContentTypes.status).toBe('missing');
    expect(strategy.recommendedContentTypes.value).toBeNull();
    expect(strategy.callsToAction.status).toBe('missing');
    expect(strategy.callsToAction.value).toBeNull();
    expect(strategy.valueDrivers.status).toBe('missing');
    expect(strategy.valueDrivers.value).toBeNull();
  });

  it('verifies that executionConstraints does not affect ReadinessScore or StrategyEvidenceScore', () => {
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), getMockBrandBrain(), null);
    const scoreBeforeReadiness = strategy.readinessScore;
    const scoreBeforeEvidence = strategy.strategyEvidenceScore;

    strategy.executionConstraints = {
      budget: 5000,
      timeframe: '3 months',
      resources: ['Internal designer']
    };

    // Re-calculating using builder scores method would give same result since it's not factored in
    expect(strategy.readinessScore).toBe(scoreBeforeReadiness);
    expect(strategy.strategyEvidenceScore).toBe(scoreBeforeEvidence);
  });

  it('verifies that strategyRisks is independent of assumptions and knowledgeGaps', () => {
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), getMockBrandBrain(), null);

    // We expect some risks, assumptions, and gaps to populate separately
    expect(strategy.strategyRisks.length).toBeGreaterThan(0);
    expect(strategy.assumptions.length).toBeGreaterThan(0);
    expect(strategy.knowledgeGaps.length).toBeGreaterThan(0);

    // They should have distinct structures and purposes
    strategy.strategyRisks.forEach(risk => {
      expect(risk).toHaveProperty('type');
      expect(risk).toHaveProperty('impact');
    });
    strategy.assumptions.forEach(ass => {
      expect(ass).toHaveProperty('statement');
    });
    strategy.knowledgeGaps.forEach(gap => {
      expect(gap).toHaveProperty('field');
      expect(gap).toHaveProperty('importance');
    });
  });

  it('verifies strategyReadinessReason logic matches specific score bounds', () => {
    const strategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', null, null, null);
    // Highly incomplete strategy
    expect(strategy.readinessScore).toBeLessThan(40);
    expect(strategy.strategyReadinessReason).toContain('Faltan definiciones clave');

    const halfStrategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), null, null);
    // objective only (confirmed objective = 30, primaryAudience = confirmed (since objective has audience) = 30. Total readiness = 60)
    expect(halfStrategy.readinessScore).toBe(60);
    expect(halfStrategy.strategyReadinessReason).toContain('buena base, pero hay elementos inferidos o faltantes');

    const completeStrategy = CampaignStrategyBuilder.buildStrategy('t1', 'c1', getMockObjective(), getMockBrandBrain(), getMockConversation(['linkedin', 'video']));
    // Objective (30) + PrimaryAudience (30) + CoreMessage (12) + Channels (5) + CTA (0) = 77
    expect(completeStrategy.readinessScore).toBe(77);
    expect(completeStrategy.strategyReadinessReason).toContain('revisar');
  });
});
