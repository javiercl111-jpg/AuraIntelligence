import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { CampaignStrategy } from '../types/campaignStrategy';
import type { 
  ExecutiveExecutionPlan, 
  StrategicPhase, 
  ExecutionAction,
  ExecutionDependency,
  ExecutionRisk,
  FieldConfidenceStatus,
  ExecutionPhaseState,
  ExecutionPhaseId
} from '../types/executiveExecutionPlan';
import { calculateExecutionReadiness } from './ExecutiveExecutionPlanValidator';

export class ExecutiveExecutionPlanBuilder {
  static build(
    objective: GrowthObjective | null,
    brand: BrandBrain | null,
    strategy: CampaignStrategy | null,
    conversationId: string
  ): ExecutiveExecutionPlan {
    const dependencies = this.extractDependencies(objective, brand, strategy);
    const knownDependencies = dependencies.filter(d => d.status === 'resolved');
    const missingDependencies = dependencies.filter(d => d.status === 'unresolved');
    
    const executionRisks = this.extractExecutionRisks(strategy, missingDependencies);
    
    const isReady = strategy && objective && brand;
    const executionGoalValue = isReady ? `Ejecutar campaña: ${strategy?.campaignObjective?.value || 'Estrategia general'}` : null;
    const executionGoalStatus: FieldConfidenceStatus = strategy?.campaignObjective?.status || 'missing';
    
    const businessJustificationValue = isReady && objective?.goal ? `Justificado por objetivo de negocio: ${objective.goal}` : null;
    const businessJustificationStatus: FieldConfidenceStatus = objective?.goal ? 'confirmed' : 'missing';
    
    const actionQueue = this.buildActionQueue(objective, brand, strategy, missingDependencies);
    const phases = this.buildStrategicPhases(actionQueue, dependencies, executionRisks);

    const plan: ExecutiveExecutionPlan = {
      id: `plan-${Date.now()}`,
      conversationId,
      status: 'draft',
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      executionGoal: {
        value: executionGoalValue,
        status: executionGoalStatus,
        source: 'CampaignStrategy',
      },
      businessJustification: {
        value: businessJustificationValue,
        status: businessJustificationStatus,
        source: 'GrowthObjective',
      },
      strategicPhases: phases,
      executivePriorities: {
        value: strategy?.recommendedChannels?.value || [],
        status: strategy?.recommendedChannels?.status || 'missing',
        source: 'CampaignStrategy'
      },
      actionQueue,
      campaignLaunchInputs: {
        value: strategy?.coreMessage?.value ? ['Core Message'] : [],
        status: strategy?.coreMessage?.status || 'missing',
        source: 'CampaignStrategy'
      },
      dependencies,
      knownDependencies,
      missingDependencies,
      executionRisks,
      
      executionConstraints: {
        budget: strategy?.executionConstraints?.budget?.toString() || undefined,
        timeframe: strategy?.executionConstraints?.timeframe || undefined,
      },
      
      executionReadiness: 0,
      executionReadinessReason: '',
      isBlocked: false,
      nextRecommendedAction: null
    };

    // Calculate readiness and determine next action
    const validation = calculateExecutionReadiness(plan);
    plan.executionReadiness = validation.score;
    plan.executionReadinessReason = validation.reason;
    plan.isBlocked = validation.isBlocked;
    plan.nextRecommendedAction = this.determineNextAction(plan);

    return plan;
  }

  private static extractDependencies(
    objective: GrowthObjective | null,
    brand: BrandBrain | null,
    strategy: CampaignStrategy | null
  ): ExecutionDependency[] {
    const deps: ExecutionDependency[] = [];
    
    // Growth Objective Dependency
    deps.push({
      id: 'dep-growth-obj',
      description: 'Objetivo de crecimiento definido y confirmado',
      requiredForPhase: 'preparation',
      criticality: 'blocker',
      status: objective?.goal ? 'resolved' : 'unresolved',
      source: 'GrowthObjective'
    });

    // Brand Brain Dependency
    deps.push({
      id: 'dep-brand-brain',
      description: 'Diferenciadores de marca confirmados',
      requiredForPhase: 'preparation',
      criticality: 'high',
      status: brand?.differentiators?.status === 'confirmed' ? 'resolved' : 'unresolved',
      source: 'BrandBrain'
    });

    // Campaign Strategy Dependency - Message
    deps.push({
      id: 'dep-strategy-msg',
      description: 'Mensaje principal de campaña (Core Message) confirmado',
      requiredForPhase: 'production',
      criticality: 'blocker',
      status: strategy?.coreMessage?.status === 'confirmed' ? 'resolved' : 'unresolved',
      source: 'CampaignStrategy'
    });

    // Campaign Strategy Dependency - Channels
    deps.push({
      id: 'dep-strategy-channels',
      description: 'Canales recomendados confirmados',
      requiredForPhase: 'production',
      criticality: 'high',
      status: strategy?.recommendedChannels?.status === 'confirmed' ? 'resolved' : 'unresolved',
      source: 'CampaignStrategy'
    });

    return deps;
  }

  private static extractExecutionRisks(strategy: CampaignStrategy | null, missingDeps: ExecutionDependency[]): ExecutionRisk[] {
    const risks: ExecutionRisk[] = [];

    if (missingDeps.some(d => d.id === 'dep-strategy-channels')) {
      risks.push({
        id: 'risk-no-channels',
        description: 'No existen canales confirmados para la producción.',
        severity: 'high',
        source: 'ExecutiveExecutionPlan',
        mitigationStatus: 'unmitigated'
      });
    }

    if (missingDeps.some(d => d.id === 'dep-strategy-msg')) {
      risks.push({
        id: 'risk-no-content',
        description: 'No existe contenido aprobado o mensaje principal.',
        severity: 'critical',
        source: 'ExecutiveExecutionPlan',
        mitigationStatus: 'unmitigated'
      });
    }

    if (!strategy?.callsToAction?.value || strategy.callsToAction.value.length === 0 || strategy.callsToAction.status !== 'confirmed') {
      risks.push({
        id: 'risk-no-cta',
        description: 'Falta validación de Call to Action (CTA) para las conversiones.',
        severity: 'medium',
        source: 'CampaignStrategy',
        mitigationStatus: 'unmitigated'
      });
    }

    return risks;
  }

  private static buildActionQueue(
    _objective: GrowthObjective | null,
    _brand: BrandBrain | null,
    strategy: CampaignStrategy | null,
    missingDeps: ExecutionDependency[]
  ): ExecutionAction[] {
    const actions: ExecutionAction[] = [];

    // Prioridad 1: Resolver dependencias críticas
    missingDeps.forEach(dep => {
      actions.push({
        id: `action-resolve-${dep.id}`,
        title: `Confirmar: ${dep.description}`,
        phase: dep.requiredForPhase,
        status: 'not_started',
        priority: dep.criticality === 'blocker' ? 'critical' : (dep.criticality === 'high' ? 'high' : 'medium'),
        source: dep.source,
        dependencyIds: [dep.id]
      });
    });

    // Validar mensaje principal (si existe pero no está confirmado)
    if (strategy?.coreMessage?.value && strategy.coreMessage.status !== 'confirmed' && !missingDeps.some(d => d.id === 'dep-strategy-msg')) {
      actions.push({
        id: 'action-validate-msg',
        title: 'Validar mensaje principal',
        phase: 'preparation',
        status: 'not_started',
        priority: 'high',
        source: 'CampaignStrategy',
        dependencyIds: []
      });
    }

    // Definir canales (si faltan)
    if (!strategy?.recommendedChannels?.value || strategy.recommendedChannels.value.length === 0 || strategy.recommendedChannels.status === 'missing') {
      actions.push({
        id: 'action-define-channels',
        title: 'Definir canales',
        phase: 'preparation',
        status: 'not_started',
        priority: 'high',
        source: 'CampaignStrategy',
        dependencyIds: []
      });
    } else if (strategy.recommendedChannels.status === 'inferred') {
      actions.push({
        id: 'action-confirm-channels',
        title: 'Validar Canales recomendados',
        phase: 'preparation',
        status: 'not_started',
        priority: 'high',
        source: 'CampaignStrategy',
        dependencyIds: []
      });
    }

    // Definir audiencia primaria (si falta)
    if (strategy?.primaryAudience?.status === 'missing') {
      actions.push({
        id: 'action-define-audience',
        title: 'Definir Audiencia primaria',
        phase: 'preparation',
        status: 'not_started',
        priority: 'high',
        source: 'CampaignStrategy',
        dependencyIds: []
      });
    }

    // Aprobar CTA
    if (strategy?.callsToAction?.value && strategy.callsToAction.status !== 'confirmed') {
      actions.push({
        id: 'action-approve-cta',
        title: 'Aprobar CTA',
        phase: 'preparation',
        status: 'not_started',
        priority: 'medium',
        source: 'CampaignStrategy',
        dependencyIds: []
      });
    }

    // Actions para fases posteriores (siempre presentes como esqueleto)
    actions.push({
      id: 'action-create-assets',
      title: 'Crear assets de campaña',
      phase: 'production',
      status: 'not_started',
      priority: 'high',
      source: 'ExecutiveExecutionPlan',
      dependencyIds: ['dep-strategy-msg', 'dep-strategy-channels']
    });

    actions.push({
      id: 'action-launch-campaign',
      title: 'Lanzar campaña al mercado',
      phase: 'launch',
      status: 'not_started',
      priority: 'critical',
      source: 'ExecutiveExecutionPlan',
      dependencyIds: ['action-create-assets']
    });

    return actions;
  }

  private static buildStrategicPhases(
    actions: ExecutionAction[], 
    dependencies: ExecutionDependency[],
    risks: ExecutionRisk[]
  ): StrategicPhase[] {
    const defaultPhases: Array<{ id: ExecutionPhaseId; label: string }> = [
      { id: 'preparation', label: 'Preparación' },
      { id: 'production', label: 'Producción' },
      { id: 'validation', label: 'Validación' },
      { id: 'launch', label: 'Lanzamiento' },
      { id: 'follow_up', label: 'Seguimiento' }
    ];

    return defaultPhases.map(phaseDef => {
      const phaseActions = actions.filter(a => a.phase === phaseDef.id);
      const phaseDependencies = dependencies.filter(d => d.requiredForPhase === phaseDef.id);
      
      // Calculate state for phase
      // A phase is blocked if it has unresolved blocker dependencies
      const hasBlocker = phaseDependencies.some(d => d.criticality === 'blocker' && d.status === 'unresolved');
      let state: ExecutionPhaseState = 'not_started';
      
      if (hasBlocker) {
        state = 'blocked';
      } else if (phaseDef.id === 'preparation' && phaseDependencies.every(d => d.status === 'resolved')) {
        state = 'ready'; 
      }

      return {
        id: phaseDef.id,
        label: phaseDef.label,
        state,
        actions: phaseActions,
        dependencies: phaseDependencies,
        risks: risks // For now we attribute all execution risks globally, or filter by phase. We attach all.
      };
    });
  }

  private static determineNextAction(plan: ExecutiveExecutionPlan): ExecutionAction | null {
    // 1. resolver dependencia crítica;
    const blockerAction = plan.actionQueue.find(a => 
      a.dependencyIds.some(depId => {
        const dep = plan.missingDependencies.find(d => d.id === depId);
        return dep?.criticality === 'blocker';
      })
    );
    if (blockerAction) return blockerAction;

    // 2. completar insumo obligatorio;
    const missingAction = plan.actionQueue.find(a => a.title.includes('Definir') || a.priority === 'critical');
    if (missingAction) return missingAction;

    // 3. confirmar campo inferido;
    const inferredAction = plan.actionQueue.find(a => a.title.includes('Confirmar'));
    if (inferredAction) return inferredAction;

    // 4. iniciar primera fase ready;
    const readyPhase = plan.strategicPhases.find(p => p.state === 'ready');
    if (readyPhase && readyPhase.actions.length > 0) {
      return readyPhase.actions[0];
    }

    // 5. revisar y aprobar el plan.
    if (!plan.isBlocked && plan.executionReadiness >= 80) {
      return {
        id: 'action-approve-plan',
        title: 'Revisar y aprobar plan de ejecución',
        phase: 'preparation',
        status: 'not_started',
        priority: 'high',
        source: 'ExecutiveExecutionPlan',
        dependencyIds: []
      };
    }

    return plan.actionQueue.length > 0 ? plan.actionQueue[0] : null;
  }
}
