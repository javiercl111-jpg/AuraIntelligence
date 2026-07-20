import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { CampaignStrategy } from '../types/campaignStrategy';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import type { ContentPlan, ContentAsset } from '../types/contentPlan';
import type {
  ExecutiveContentBrief,
  SelectedAsset,
  OriginArtifact,
  SupportingEvidence,
  Constraint,
  SuccessCriterion,
  AcceptanceChecklist,
  NextGenerationAction
} from '../types/executiveContentBrief';
import { calculateBriefReadiness } from './ExecutiveContentBriefValidator';

export class ExecutiveContentBriefBuilder {
  static build(
    objective: GrowthObjective | null,
    brand: BrandBrain | null,
    strategy: CampaignStrategy | null,
    execution: ExecutiveExecutionPlan | null,
    plan: ContentPlan | null,
    conversationId: string,
    explicitAssetId?: string
  ): ExecutiveContentBrief {
    // 1. Determine selected asset
    let selectedAsset: SelectedAsset | null = null;
    let assetObj: ContentAsset | undefined;

    if (plan) {
      if (explicitAssetId) {
        assetObj = plan.contentAssets.find(a => a.id === explicitAssetId);
      } else if (plan.nextRecommendedAsset) {
        assetObj = plan.nextRecommendedAsset;
      }

      if (assetObj) {
        selectedAsset = {
          assetId: assetObj.id,
          title: assetObj.title
        };
      }
    }

    // 2. Extract Origin Artifacts
    const originArtifacts = this.extractOriginArtifacts(objective, brand, strategy, execution, plan);

    // 3. Extract Supporting Evidence
    const supportingEvidence = this.extractSupportingEvidence(assetObj, objective, strategy);

    // 4. Constraints
    const constraints = this.extractConstraints(brand, execution);

    // 5. Success Criteria
    const successCriteria = this.extractSuccessCriteria(strategy);

    // 6. Acceptance Checklist
    const acceptanceChecklist = this.buildAcceptanceChecklist(assetObj);

    // 7. Base Brief
    const brief: ExecutiveContentBrief = {
      id: `brief-${Date.now()}`,
      conversationId,
      contentPlanId: plan?.id || 'missing',
      selectedAssetId: selectedAsset?.assetId || 'none',
      status: 'draft',
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      briefGoal: {
        value: 'Proveer directrices de producción precisas para un motor de IA generativa sin requerir prompt engineering.',
        status: 'confirmed',
        source: 'aura_governance'
      },
      selectedAsset,
      assetPurpose: assetObj ? { value: assetObj.purpose, status: 'confirmed', source: 'ContentPlan' } : { value: '', status: 'missing', source: 'system' },
      businessContext: objective?.goal ? { value: objective.goal, status: 'confirmed', source: 'GrowthObjective' } : { value: '', status: 'missing', source: 'system' },
      targetAudience: assetObj?.audience ? { ...assetObj.audience, source: 'ContentPlan' } : { value: '', status: 'missing', source: 'system' },

      executiveIntent: execution?.executionGoal?.value ? { value: 'conversion', status: 'inferred', source: 'ExecutiveExecutionPlan' } : { value: 'unknown', status: 'missing', source: 'system' },
      coreMessage: strategy?.coreMessage ? { value: strategy.coreMessage.value || '', status: strategy.coreMessage.status === 'confirmed' ? 'confirmed' : 'inferred', source: 'CampaignStrategy' } : { value: '', status: 'missing', source: 'system' },

      brandGuidelines: brand?.communicationStyle ? { value: [brand.communicationStyle.value || ''], status: brand.communicationStyle.status === 'confirmed' ? 'confirmed' : 'inferred', source: 'BrandBrain' } : { value: [], status: 'missing', source: 'system' },
      tone: brand?.brandTone ? { value: brand.brandTone.value || '', status: brand.brandTone.status === 'confirmed' ? 'confirmed' : 'inferred', source: 'BrandBrain' } : { value: '', status: 'missing', source: 'system' },
      distributionTargets: assetObj?.distributionTargets ? { ...assetObj.distributionTargets, source: 'ContentPlan' } : { value: [], status: 'missing', source: 'system' },

      originArtifacts,
      supportingEvidence,
      constraints,
      successCriteria,
      acceptanceChecklist,

      briefReadiness: 0,
      briefReadinessReason: '',
      isBlocked: false,
      blockingReasons: [],

      nextGenerationAction: {
        action: 'review_brief',
        assetId: selectedAsset?.assetId || 'none',
        label: 'Revisar Brief',
        isEnabled: true
      }
    };

    // 8. Calculate Readiness
    const readiness = calculateBriefReadiness(brief, plan);
    brief.briefReadiness = readiness.score;
    brief.isBlocked = readiness.isBlocked;
    brief.blockingReasons = readiness.blockingReasons;
    brief.briefReadinessReason = readiness.reason;

    // 9. Determine Next Action
    brief.nextGenerationAction = this.determineNextAction(brief);

    // Status alignment (Draft -> review_required -> approved handled by user action usually, but we set initial appropriately)
    if (brief.briefReadiness === 100 && !brief.isBlocked) {
      brief.status = 'review_required';
    }

    return brief;
  }

  private static extractOriginArtifacts(
    objective: GrowthObjective | null,
    brand: BrandBrain | null,
    strategy: CampaignStrategy | null,
    execution: ExecutiveExecutionPlan | null,
    plan: ContentPlan | null
  ): OriginArtifact[] {
    const origins: OriginArtifact[] = [];
    if (objective) origins.push({ type: 'GrowthObjective', id: objective.id, schemaVersion: String(objective.schemaVersion || '1.0'), fieldsUsed: ['goal'] });
    if (brand) origins.push({ type: 'BrandBrain', id: brand.id, schemaVersion: '1.0', fieldsUsed: ['brandTone', 'communicationStyle'] });
    if (strategy) origins.push({ type: 'CampaignStrategy', id: strategy.id, schemaVersion: '1.0', fieldsUsed: ['coreMessage'] });
    if (execution) origins.push({ type: 'ExecutiveExecutionPlan', id: execution.id, schemaVersion: execution.schemaVersion, fieldsUsed: ['executionGoal'] });
    if (plan) origins.push({ type: 'ContentPlan', id: plan.id, schemaVersion: plan.schemaVersion, fieldsUsed: ['contentAssets'] });
    return origins;
  }

  private static extractSupportingEvidence(asset: ContentAsset | undefined, objective: GrowthObjective | null, strategy: CampaignStrategy | null): SupportingEvidence[] {
    const evidence: SupportingEvidence[] = [];
    if (!asset) return evidence;

    if (objective?.audience) {
      evidence.push({
        artifactType: 'GrowthObjective',
        artifactId: objective.id,
        field: 'audience',
        value: objective.audience,
        source: 'GrowthObjective',
        evidence: 'User input',
        status: 'confirmed'
      });
    }

    if (strategy?.recommendedChannels?.value) {
      evidence.push({
        artifactType: 'CampaignStrategy',
        artifactId: strategy.id,
        field: 'recommendedChannels',
        value: strategy.recommendedChannels.value,
        source: 'CampaignStrategy',
        evidence: strategy.recommendedChannels.evidence || 'Strategic inference',
        status: strategy.recommendedChannels.status === 'confirmed' ? 'confirmed' : 'inferred'
      });
    }

    return evidence;
  }

  private static extractConstraints(brand: BrandBrain | null, execution: ExecutiveExecutionPlan | null): Constraint[] {
    const constraints: Constraint[] = [
      {
        id: 'c-sys-1',
        type: 'evidence',
        description: 'No inventar cifras. Utilizar estrictamente la evidencia proporcionada.',
        source: 'aura_governance',
        status: 'confirmed'
      },
      {
        id: 'c-sys-2',
        type: 'business',
        description: 'No prometer resultados o garantías no aprobadas.',
        source: 'aura_governance',
        status: 'confirmed'
      },
      {
        id: 'c-sys-3',
        type: 'brand',
        description: 'No modificar la propuesta de valor fundamental de la marca.',
        source: 'aura_governance',
        status: 'confirmed'
      }
    ];

    if (brand?.communicationStyle?.value) {
      constraints.push({
        id: `c-brand-0`,
        type: 'brand',
        description: brand.communicationStyle.value,
        source: 'BrandBrain',
        status: brand.communicationStyle.status === 'confirmed' ? 'confirmed' : 'inferred'
      });
    }

    if (execution?.executionConstraints) {
      if (execution.executionConstraints.budget) {
        constraints.push({ id: `c-exec-budget`, type: 'business', description: `Presupuesto: ${execution.executionConstraints.budget}`, source: 'ExecutiveExecutionPlan', status: 'confirmed' });
      }
      if (execution.executionConstraints.timeframe) {
        constraints.push({ id: `c-exec-timeframe`, type: 'business', description: `Plazo: ${execution.executionConstraints.timeframe}`, source: 'ExecutiveExecutionPlan', status: 'confirmed' });
      }
      if (execution.executionConstraints.resources) {
        constraints.push({ id: `c-exec-resources`, type: 'business', description: `Recursos: ${execution.executionConstraints.resources.join(', ')}`, source: 'ExecutiveExecutionPlan', status: 'confirmed' });
      }
    }

    return constraints;
  }

  private static extractSuccessCriteria(strategy: CampaignStrategy | null): SuccessCriterion[] {
    const criteria: SuccessCriterion[] = [
      {
        id: 'sc-sys-1',
        description: 'Mantener tono consultivo sin sonar puramente promocional.',
        isVerifiable: true,
        status: 'confirmed'
      },
      {
        id: 'sc-sys-2',
        description: 'No introducir afirmaciones sin evidencia respaldada.',
        isVerifiable: true,
        status: 'confirmed'
      }
    ];

    if (strategy?.campaignObjective?.value) {
      criteria.push({
        id: `sc-strat-obj`,
        description: `Alinear con objetivo de campaña: ${strategy.campaignObjective.value}`,
        isVerifiable: true,
        status: strategy.campaignObjective.status === 'confirmed' ? 'confirmed' : 'inferred'
      });
    }

    return criteria;
  }

  private static buildAcceptanceChecklist(asset: ContentAsset | undefined): AcceptanceChecklist[] {
    if (!asset) return [];
    return [
      {
        id: 'chk-msg',
        label: 'El mensaje central está claramente articulado',
        required: true,
        status: 'pending',
        source: 'aura_governance'
      },
      {
        id: 'chk-aud',
        label: 'El tono es apropiado para la audiencia objetivo',
        required: true,
        status: 'pending',
        source: 'aura_governance'
      },
      {
        id: 'chk-const',
        label: 'Se respetaron todas las restricciones institucionales',
        required: true,
        status: 'pending',
        source: 'aura_governance'
      }
    ];
  }

  private static determineNextAction(brief: ExecutiveContentBrief): NextGenerationAction {
    if (brief.status === 'approved') {
      return {
        action: 'generate_asset',
        assetId: brief.selectedAssetId,
        label: 'Generar Activo con IA',
        isEnabled: true
      };
    }

    if (brief.briefReadiness === 100 && !brief.isBlocked) {
      return {
        action: 'approve_brief',
        assetId: brief.selectedAssetId,
        label: 'Aprobar Brief',
        isEnabled: true
      };
    }

    return {
      action: 'review_brief',
      assetId: brief.selectedAssetId,
      label: 'Revisar Brief',
      isEnabled: true,
      blockingReason: brief.isBlocked ? 'Insumos críticos faltantes' : 'Revisión requerida'
    };
  }
}
