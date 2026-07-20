import type { ExecutiveExecutionPlan, FieldConfidenceStatus } from '../types/executiveExecutionPlan';

export interface ReadinessValidationResult {
  score: number;
  reason: string;
  isBlocked: boolean;
}

export function calculateExecutionReadiness(plan: ExecutiveExecutionPlan): ReadinessValidationResult {
  const getMultiplier = (status: FieldConfidenceStatus | 'ready' | 'partial' | 'blocked' | 'completed' | 'in_progress' | 'not_started'): number => {
    switch (status) {
      case 'confirmed':
      case 'ready':
      case 'completed':
        return 1.0;
      case 'inferred':
      case 'partial':
      case 'in_progress':
        return 0.4;
      case 'missing':
      case 'blocked':
      case 'not_started':
      default:
        return 0.0;
    }
  };

  let score = 0;

  // 1. executionGoal: 20
  score += 20 * getMultiplier(plan.executionGoal.status);
  
  // 2. businessJustification: 10
  score += 10 * getMultiplier(plan.businessJustification.status);

  // 3. executivePriorities: 15
  score += 15 * getMultiplier(plan.executivePriorities.status);

  // 4. actionQueue: 20
  // Consider actionQueue 'ready' if length > 0
  const actionQueueStatus = plan.actionQueue.length > 0 ? 'ready' : 'missing';
  score += 20 * getMultiplier(actionQueueStatus);

  // 5. knownDependencies: 15
  // Consider 'ready' if all dependencies are resolved, 'partial' if some, 'missing' if none (but actually we only evaluate knownDependencies, meaning resolved ones vs total).
  // Formula logic: score based on ratio of known to total dependencies.
  const totalDeps = plan.dependencies.length;
  const knownDeps = plan.knownDependencies.length;
  let depsMultiplier = 0;
  if (totalDeps === 0) {
    depsMultiplier = 1.0; // No dependencies means fully ready in this aspect
  } else {
    const ratio = knownDeps / totalDeps;
    if (ratio === 1) depsMultiplier = 1.0;
    else if (ratio > 0) depsMultiplier = 0.4;
  }
  score += 15 * depsMultiplier;

  // 6. executionRisks: 10
  // Score based on risks. If there are unmitigated critical/high risks, lower multiplier.
  let risksMultiplier = 1.0;
  if (plan.executionRisks.some(r => r.severity === 'critical' && r.mitigationStatus === 'unmitigated')) {
    risksMultiplier = 0.0; // riesgo crítico no mitigado
  } else if (plan.executionRisks.length > 0) {
    risksMultiplier = 0.4; // riesgo parcial o recomendado
  }
  // sin riesgos críticos no mitigados y sin riesgos: 1.0 (o si se decide que los parciales son 0.4)

  score += 10 * risksMultiplier;

  // 7. campaignLaunchInputs: 10
  score += 10 * getMultiplier(plan.campaignLaunchInputs.status);

  // Math.round to ensure it is integer
  score = Math.round(score);
  // Ensure limits 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine if blocked
  const hasBlocker = plan.missingDependencies.some(d => d.criticality === 'blocker');
  let isBlocked = hasBlocker;

  // Mandatory fields for readiness
  const isExecutionGoalMissing = plan.executionGoal.status === 'missing';
  const isActionQueueMissing = plan.actionQueue.length === 0;

  if (isExecutionGoalMissing || isActionQueueMissing) {
    isBlocked = true; // El plan tampoco puede considerarse ready
  }

  // Generate reason
  let reason = '';
  if (isBlocked) {
    if (hasBlocker) {
      reason = 'La ejecución está bloqueada por dependencias críticas no resueltas.';
    } else if (isExecutionGoalMissing) {
      reason = 'No se puede ejecutar sin un objetivo definido (Execution Goal missing).';
    } else {
      reason = 'La estrategia carece de acciones ejecutables.';
    }
  } else if (score >= 80) {
    reason = 'El plan está sólido y listo para iniciar la fase de preparación.';
  } else if (score >= 50) {
    reason = 'La estrategia tiene bases, pero requiere confirmación de prioridades y riesgos.';
  } else {
    reason = 'Faltan insumos clave para iniciar la ejecución con seguridad.';
  }

  return {
    score,
    reason,
    isBlocked
  };
}
