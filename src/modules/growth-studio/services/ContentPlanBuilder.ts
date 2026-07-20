import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { CampaignStrategy } from '../types/campaignStrategy';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import type {
  ContentPlan,
  ContentAsset,
  ProductionInput,
  ContentDependency,
  ContentRisk,
  AssetDependencyGraph
} from '../types/contentPlan';
import { calculateContentReadiness } from './ContentPlanValidator';

export class ContentPlanBuilder {
  static build(
    objective: GrowthObjective | null,
    _brand: BrandBrain | null,
    strategy: CampaignStrategy | null,
    _execution: ExecutiveExecutionPlan | null,
    conversationId: string
  ): ContentPlan {
    const productionInputs = this.extractProductionInputs(strategy);
    const contentRisks = this.extractRisks(strategy);
    const assetDependencies = this.extractDependencies(strategy);

    const allAssets = this.buildAssets(objective, strategy);
    const knownAssets = allAssets.filter(a => a.status === 'confirmed');
    const missingAssets = allAssets.filter(a => a.status !== 'confirmed');

    const assetPipeline = this.buildDAG(allAssets);

    const plan: ContentPlan = {
      id: `content-plan-${Date.now()}`,
      conversationId,
      status: 'draft',
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      contentObjectives: {
        value: strategy?.campaignObjective?.value ? [strategy.campaignObjective.value] : [],
        status: strategy?.campaignObjective?.status || 'missing',
        source: 'CampaignStrategy'
      },
      productionPriorities: {
        value: strategy?.recommendedContentTypes?.value || [],
        status: strategy?.recommendedContentTypes?.status || 'missing',
        source: 'CampaignStrategy'
      },

      contentAssets: allAssets,
      knownAssets,
      missingAssets,
      assetDependencies,
      assetPipeline,
      productionInputs,
      contentRisks,

      contentReadiness: 0,
      contentReadinessReason: '',
      isBlocked: false,
      nextRecommendedAsset: null
    };

    const validation = calculateContentReadiness(plan);
    plan.contentReadiness = validation.score;
    plan.contentReadinessReason = validation.reason;
    plan.isBlocked = validation.isBlocked;
    plan.nextRecommendedAsset = this.determineNextAsset(plan);

    return plan;
  }

  private static extractProductionInputs(strategy: CampaignStrategy | null): ProductionInput[] {
    const inputs: ProductionInput[] = [];

    // Mensaje
    inputs.push({
      id: 'input-msg',
      type: 'message',
      description: 'Mensaje principal aprobado',
      value: strategy?.coreMessage?.value || null,
      status: strategy?.coreMessage?.status || 'missing',
      isReady: strategy?.coreMessage?.status === 'confirmed',
      source: 'CampaignStrategy'
    });

    // CTA
    inputs.push({
      id: 'input-cta',
      type: 'cta',
      description: 'Llamado a la acción (CTA) definido',
      value: strategy?.callsToAction?.value ? strategy.callsToAction.value.join(', ') : null,
      status: strategy?.callsToAction?.status || 'missing',
      isReady: strategy?.callsToAction?.status === 'confirmed',
      source: 'CampaignStrategy'
    });

    // Audiencia
    inputs.push({
      id: 'input-aud',
      type: 'audience',
      description: 'Audiencia objetivo identificada',
      value: strategy?.primaryAudience?.value || null,
      status: strategy?.primaryAudience?.status || 'missing',
      isReady: strategy?.primaryAudience?.status === 'confirmed',
      source: 'CampaignStrategy'
    });

    // Canales
    inputs.push({
      id: 'input-chan',
      type: 'channels',
      description: 'Canales de distribución disponibles',
      value: strategy?.recommendedChannels?.value ? strategy.recommendedChannels.value.join(', ') : null,
      status: strategy?.recommendedChannels?.status || 'missing',
      isReady: strategy?.recommendedChannels?.status === 'confirmed',
      source: 'CampaignStrategy'
    });

    return inputs;
  }

  private static extractDependencies(strategy: CampaignStrategy | null): ContentDependency[] {
    const deps: ContentDependency[] = [];
    if (!strategy?.coreMessage?.value) {
      deps.push({
        id: 'dep-missing-msg',
        description: 'Requiere validación del mensaje principal antes de redactar copy',
        status: 'unresolved',
        criticality: 'blocker'
      });
    }
    return deps;
  }

  private static extractRisks(strategy: CampaignStrategy | null): ContentRisk[] {
    const risks: ContentRisk[] = [];
    if (!strategy?.recommendedChannels?.value || strategy.recommendedChannels.value.length === 0) {
      risks.push({
        id: 'risk-no-dist',
        description: 'No hay canales de distribución (distributionTargets) definidos para los activos',
        severity: 'high',
        mitigationStatus: 'unmitigated',
        source: 'CampaignStrategy'
      });
    }
    return risks;
  }

  private static buildAssets(objective: GrowthObjective | null, strategy: CampaignStrategy | null): ContentAsset[] {
    const assets: ContentAsset[] = [];
    if (!strategy?.recommendedContentTypes?.value) return assets;

    const types = strategy.recommendedContentTypes.value;
    const channels = strategy.recommendedChannels?.value || [];
    const audienceValue = strategy.primaryAudience?.value || 'Audiencia General';
    const audienceStatus = strategy.primaryAudience?.status || 'missing';

    types.forEach((type, index) => {
      assets.push({
        id: `asset-${index + 1}`,
        title: type,
        objective: {
          value: `Soportar objetivo: ${objective?.goal || 'General'}`,
          status: objective?.goal ? 'confirmed' : 'missing',
          source: 'GrowthObjective'
        },
        audience: {
          value: audienceValue,
          status: audienceStatus,
          source: 'CampaignStrategy'
        },
        phase: 'not_started',
        priority: index === 0 ? 'critical' : 'high', // Simplificación
        distributionTargets: {
          value: channels.length > 0 ? channels : [],
          status: channels.length > 0 ? 'confirmed' : 'missing',
          source: 'CampaignStrategy'
        },
        dependencyIds: [],
        status: 'confirmed',
        source: 'CampaignStrategy',
        evidence: 'Derivado de recommendedContentTypes',
        purpose: `Generar tracción para la campaña mediante formato ${type}`,
        originArtifact: 'CampaignStrategy',
        parents: [],
        children: []
      });
    });

    return assets;
  }

  private static buildDAG(assets: ContentAsset[]): AssetDependencyGraph {
    const nodes = assets.map(a => a.id);
    const edges: { from: string; to: string }[] = [];

    // Linear DAG (A -> B -> C)
    for (let i = 0; i < assets.length - 1; i++) {
      const from = assets[i].id;
      const to = assets[i + 1].id;
      edges.push({ from, to });

      assets[i].children.push(to);
      assets[i+1].parents.push(from);
      assets[i+1].dependencyIds.push(from);
    }

    return { nodes, edges };
  }

  private static determineNextAsset(plan: ContentPlan): ContentAsset | null {
    if (plan.isBlocked || plan.contentAssets.length === 0) return null;

    // Prioridad ejecutiva:
    // - desbloquea más dependencias (highest children count)
    // - mayor impacto estratégico (critical priority > high)
    // - menor número de dependencias (parents === 0)
    // - primer activo disponible

    const available = plan.contentAssets.filter(a => a.phase === 'not_started' && a.parents.every(pId => {
      const parent = plan.contentAssets.find(x => x.id === pId);
      return parent?.phase === 'ready';
    }));

    if (available.length === 0) return null;

    return available.sort((a, b) => {
      // 1. Menor número de dependencias (parents length ascending)
      if (a.parents.length !== b.parents.length) {
        return a.parents.length - b.parents.length;
      }

      // 2. Desbloquea más dependencias (children length descending)
      if (a.children.length !== b.children.length) {
        return b.children.length - a.children.length;
      }

      // 3. Impacto estratégico (priority)
      const priorityWeights: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;

      return 0; // Primer activo disponible en el orden original
    })[0];
  }
}
