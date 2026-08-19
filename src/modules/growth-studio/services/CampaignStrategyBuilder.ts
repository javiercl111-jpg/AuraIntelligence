import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { GrowthConversation, GrowthConversationTurn } from '../types/growthConversation';
import type {
  CampaignStrategy,
  CampaignStrategyField,
  CampaignStrategyFieldStatus
} from '../types/campaignStrategy';

export class CampaignStrategyBuilder {
  public static buildStrategy(
    tenantId: string,
    companyId: string,
    objective: GrowthObjective | null,
    brandBrain: BrandBrain | null,
    conversation: GrowthConversation | null
  ): CampaignStrategy {
    const strategy: CampaignStrategy = {
      id: `cs_${Date.now()}`,
      tenantId,
      companyId,
      campaignObjective: this.buildObjectiveField(objective),
      primaryAudience: this.buildPrimaryAudienceField(objective, brandBrain),
      secondaryAudience: this.buildField<string>('secondaryAudience', null, 'missing', undefined, undefined),
      coreMessage: this.buildCoreMessageField(brandBrain),
      valueDrivers: this.buildValueDriversField(brandBrain),
      recommendedChannels: this.buildChannelsField(
        conversation,
        objective,
        brandBrain,
      ),
      recommendedContentTypes: this.buildContentTypesField(conversation),
      callsToAction: this.buildCallsToActionField(conversation),
      assumptions: [],
      knowledgeGaps: [],
      strategyRisks: [],
      strategyEvidenceScore: 0,
      readinessScore: 0,
      strategyReadinessReason: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.calculateScores(strategy);
    this.extractRisksAndAssumptions(strategy);

    return strategy;
  }

  private static buildField<T>(
    _name: string,
    value: T | null,
    status: CampaignStrategyFieldStatus,
    source?: string,
    evidence?: string
  ): CampaignStrategyField<T> {
    return { value, status, source, evidence };
  }

  private static buildObjectiveField(objective: GrowthObjective | null): CampaignStrategyField<string> {
    if (objective?.goal && objective?.productOrService) {
      const normalizedGoal =
        objective.goal
          .toLocaleLowerCase('es')
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            '',
          );

      const normalizedProduct =
        objective.productOrService
          .toLocaleLowerCase('es')
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            '',
          );

      const goalIncludesProduct =
        normalizedGoal.includes(
          normalizedProduct,
        );

      const campaignObjectiveValue =
        goalIncludesProduct
          ? objective.goal.trim()
          : `${objective.goal.trim()} ${objective.productOrService.trim()}`;
      return this.buildField(
        'campaignObjective',
        campaignObjectiveValue,
        'confirmed',
        'Growth Objective',
        `Goal: ${objective.goal}, Product: ${objective.productOrService}`
      );
    }
    return this.buildField<string>('campaignObjective', null, 'missing');
  }

  private static buildPrimaryAudienceField(objective: GrowthObjective | null, brandBrain: BrandBrain | null): CampaignStrategyField<string> {
    if (objective?.audience) {
      return this.buildField('primaryAudience', objective.audience, 'confirmed', 'Growth Objective', objective.audience);
    }
    if (brandBrain?.targetAudience.status === 'confirmed' && brandBrain.targetAudience.value) {
      return this.buildField('primaryAudience', brandBrain.targetAudience.value, 'inferred', 'Brand Brain', brandBrain.targetAudience.value);
    }
    return this.buildField<string>('primaryAudience', null, 'missing');
  }

  private static buildCoreMessageField(brandBrain: BrandBrain | null): CampaignStrategyField<string> {
    if (brandBrain?.valueProposition.status === 'confirmed' && brandBrain.valueProposition.value) {
      return this.buildField('coreMessage', brandBrain.valueProposition.value, 'inferred', 'Brand Brain (Value Proposition)', brandBrain.valueProposition.value);
    }
    return this.buildField<string>('coreMessage', null, 'missing');
  }

  private static buildValueDriversField(brandBrain: BrandBrain | null): CampaignStrategyField<string[]> {
    if (brandBrain?.differentiators.status === 'confirmed' && brandBrain.differentiators.value && brandBrain.differentiators.value.length > 0) {
      return this.buildField('valueDrivers', brandBrain.differentiators.value, 'inferred', 'Brand Brain (Differentiators)', brandBrain.differentiators.value.join(', '));
    }
    return this.buildField<string[]>('valueDrivers', null, 'missing');
  }

  private static buildChannelsField(
    conversation: GrowthConversation | null,
    objective: GrowthObjective | null,
    brandBrain: BrandBrain | null,
  ): CampaignStrategyField<string[]> {
    const structuredChannels =
      conversation?.structuredContext
        ?.campaignChannels
        ?.map(channel => channel.trim())
        .filter(Boolean);

    if (
      structuredChannels &&
      structuredChannels.length > 0
    ) {
      return this.buildField(
        'recommendedChannels',
        structuredChannels,
        'confirmed',
        'Growth Conversation / Campaign Intake',
        structuredChannels.join(', '),
      );
    }
    const recommendationRequested =
      conversation?.structuredContext
        ?.campaignChannelRecommendationRequested ===
      true;

    if (recommendationRequested) {
      const recommendation =
        this.recommendDelegatedChannels(
          objective,
          brandBrain,
        );

      if (recommendation) {
        return this.buildField(
          'recommendedChannels',
          recommendation.channels,
          'inferred',
          'Aura Growth Channel Recommendation Policy V1',
          recommendation.evidence,
        );
      }

      return this.buildField<string[]>(
        'recommendedChannels',
        null,
        'missing',
        'Aura Growth Channel Recommendation Policy V1',
        'Explicit recommendation delegation was provided, but available evidence was insufficient for a supported channel recommendation.',
      );
    }
    // We explicitly do not assume any channels without evidence.
    // Let's check conversation for explicit channel mentions.
    const explicitChannels: string[] = [];
    let evidence = '';

    if (conversation) {
      const turns = (conversation as unknown as Record<string, unknown>).turns as GrowthConversationTurn[] | undefined;
      if (turns) {
        const allText = turns.map(t => t.content).join(' ').toLowerCase();
      if (allText.includes('linkedin')) { explicitChannels.push('LinkedIn'); evidence += 'Mentioned LinkedIn. '; }
      if (allText.includes('facebook')) { explicitChannels.push('Facebook'); evidence += 'Mentioned Facebook. '; }
      if (allText.includes('instagram')) { explicitChannels.push('Instagram'); evidence += 'Mentioned Instagram. '; }
      if (allText.includes('tiktok')) { explicitChannels.push('TikTok'); evidence += 'Mentioned TikTok. '; }
      if (allText.includes('email')) { explicitChannels.push('Email'); evidence += 'Mentioned Email. '; }
      if (allText.includes('whatsapp')) { explicitChannels.push('WhatsApp'); evidence += 'Mentioned WhatsApp. '; }
      }
    }

    if (explicitChannels.length > 0) {
      return this.buildField('recommendedChannels', explicitChannels, 'confirmed', 'Conversation', evidence.trim());
    }

    return this.buildField<string[]>('recommendedChannels', null, 'missing');
  }

  private static recommendDelegatedChannels(
    objective: GrowthObjective | null,
    brandBrain: BrandBrain | null,
  ): {
    channels: string[];
    evidence: string;
  } | null {
    const objectiveAudience =
      objective?.audience?.trim() || '';

    const brandAudience =
      brandBrain?.targetAudience?.value?.trim() ||
      '';

    const industry =
      brandBrain?.industry?.value?.trim() || '';

    const evidenceText = [
      objectiveAudience,
      brandAudience,
      industry,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      );

    if (!evidenceText) {
      return null;
    }

    const b2bSignals = [
      'b2b',
      'empresa',
      'empresas',
      'empresarial',
      'corporativo',
      'corporativa',
      'negocio',
      'negocios',
      'hotel',
      'hoteles',
      'restaurante',
      'restaurantes',
      'pyme',
      'pymes',
    ];

    if (
      b2bSignals.some(signal =>
        evidenceText.includes(signal),
      )
    ) {
      return {
        channels: [
          'LinkedIn',
          'Email',
        ],
        evidence:
          `Delegated recommendation supported by business-audience evidence: ${[
            objectiveAudience,
            brandAudience,
            industry,
          ]
            .filter(Boolean)
            .join(' | ')}`,
      };
    }

    const consumerSignals = [
      'b2c',
      'consumidor',
      'consumidores',
      'cliente final',
      'clientes finales',
      'publico general',
      'personas',
    ];

    if (
      consumerSignals.some(signal =>
        evidenceText.includes(signal),
      )
    ) {
      return {
        channels: [
          'Instagram',
          'Facebook',
        ],
        evidence:
          `Delegated recommendation supported by consumer-audience evidence: ${[
            objectiveAudience,
            brandAudience,
            industry,
          ]
            .filter(Boolean)
            .join(' | ')}`,
      };
    }

    return null;
  }
  private static buildCallsToActionField(
    conversation: GrowthConversation | null,
  ): CampaignStrategyField<string[]> {
    const structuredCallToAction =
      conversation?.structuredContext
        ?.campaignCallToAction
        ?.trim();

    if (structuredCallToAction) {
      return this.buildField(
        'callsToAction',
        [structuredCallToAction],
        'confirmed',
        'Growth Conversation / Campaign Intake',
        structuredCallToAction,
      );
    }

    return this.buildField<string[]>(
      'callsToAction',
      null,
      'missing',
    );
  }
  private static buildContentTypesField(conversation: GrowthConversation | null): CampaignStrategyField<string[]> {
    const explicitTypes: string[] = [];
    let evidence = '';

    if (conversation) {
      const turns = (conversation as unknown as Record<string, unknown>).turns as GrowthConversationTurn[] | undefined;
      if (turns) {
        const allText = turns.map(t => t.content).join(' ').toLowerCase();
      if (allText.includes('video')) { explicitTypes.push('Video'); evidence += 'Mentioned Video. '; }
      if (allText.includes('artículo') || allText.includes('article') || allText.includes('blog')) { explicitTypes.push('Article/Blog'); evidence += 'Mentioned Article/Blog. '; }
      if (allText.includes('imagen') || allText.includes('foto')) { explicitTypes.push('Image'); evidence += 'Mentioned Image. '; }
      }
    }

    if (explicitTypes.length > 0) {
      return this.buildField('recommendedContentTypes', explicitTypes, 'confirmed', 'Conversation', evidence.trim());
    }

    return this.buildField<string[]>('recommendedContentTypes', null, 'missing');
  }

  private static calculateScores(strategy: CampaignStrategy) {
    // 1. Readiness Score (Weights: 30/30/30/5/5)
    let readinessScore = 0;
    readinessScore += this.getScore(strategy.campaignObjective.status, 30);
    readinessScore += this.getScore(strategy.primaryAudience.status, 30);
    readinessScore += this.getScore(strategy.coreMessage.status, 30);
    readinessScore += this.getScore(strategy.recommendedChannels.status, 5);
    readinessScore += this.getScore(strategy.callsToAction.status, 5);

    strategy.readinessScore = Math.min(100, Math.max(0, Math.round(readinessScore)));

    if (strategy.readinessScore < 40) {
      strategy.strategyReadinessReason = 'Faltan definiciones clave (objetivo, audiencia, mensaje) para poder lanzar.';
    } else if (strategy.readinessScore < 80) {
      strategy.strategyReadinessReason = 'La estrategia tiene buena base, pero hay elementos inferidos o faltantes menores que revisar.';
    } else {
      strategy.strategyReadinessReason = 'La estrategia está muy sólida y lista para pasar a planificación de ejecución.';
    }

    // 2. Strategy Evidence Score (Weights: 20/15/15/10/10/10/10/10)
    let evidenceScore = 0;
    evidenceScore += this.getScore(strategy.campaignObjective.status, 20);
    evidenceScore += this.getScore(strategy.primaryAudience.status, 15);
    evidenceScore += this.getScore(strategy.coreMessage.status, 15);
    evidenceScore += this.getScore(strategy.valueDrivers.status, 10);
    evidenceScore += this.getScore(strategy.recommendedChannels.status, 10);
    evidenceScore += this.getScore(strategy.recommendedContentTypes.status, 10);
    evidenceScore += this.getScore(strategy.callsToAction.status, 10);
    evidenceScore += this.getScore(strategy.secondaryAudience.status, 10);

    strategy.strategyEvidenceScore = Math.min(100, Math.max(0, Math.round(evidenceScore)));
  }

  private static getScore(status: CampaignStrategyFieldStatus, weight: number): number {
    switch (status) {
      case 'confirmed': return weight;
      case 'inferred': return weight * 0.4;
      case 'missing': return 0;
      default: return 0;
    }
  }

  private static extractRisksAndAssumptions(strategy: CampaignStrategy) {
    if (strategy.recommendedChannels.status === 'missing') {
      strategy.strategyRisks.push({
        type: 'execution',
        description: 'No se han definido canales de distribución claros, lo que puede retrasar el lanzamiento.',
        impact: 'high'
      });
      strategy.knowledgeGaps.push({
        field: 'recommendedChannels',
        label: 'Canales Recomendados',
        importance: 'high'
      });
    }

    if (strategy.callsToAction.status === 'missing') {
      strategy.knowledgeGaps.push({
        field: 'callsToAction',
        label: 'Llamados a la Acción (CTA)',
        importance: 'medium'
      });
    }

    if (strategy.coreMessage.status === 'inferred') {
      strategy.assumptions.push({
        field: 'coreMessage',
        statement: 'Se asume que el mensaje central está alineado con la propuesta de valor general de la marca.',
        confidence: 'medium'
      });
      strategy.strategyRisks.push({
        type: 'business',
        description: 'El mensaje central ha sido inferido. Puede no resonar específicamente con el objetivo de campaña actual.',
        impact: 'medium'
      });
    }

    if (strategy.primaryAudience.status === 'inferred') {
      strategy.assumptions.push({
        field: 'primaryAudience',
        statement: 'Se asume que la audiencia objetivo de la campaña coincide con el público general de la marca.',
        confidence: 'medium'
      });
    }
  }
}
