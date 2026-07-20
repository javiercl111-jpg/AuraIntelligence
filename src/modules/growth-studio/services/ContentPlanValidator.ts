import type { ContentPlan } from '../types/contentPlan';

export function calculateContentReadiness(plan: ContentPlan): { score: number; reason: string; isBlocked: boolean } {
  let score = 0;

  // Structural invalidity check
  if (plan.contentObjectives.status === 'missing' || plan.knownAssets.length === 0) {
    return {
      score: 0,
      reason: 'El plan carece de objetivos de contenido o no tiene activos conocidos.',
      isBlocked: plan.isBlocked
    };
  }

  // 1. contentObjectives (25)
  if (plan.contentObjectives.status === 'confirmed') score += 25;
  else if (plan.contentObjectives.status === 'inferred') score += 25 * 0.4;

  // 2. productionPriorities (20)
  if (plan.productionPriorities.status === 'confirmed') score += 20;
  else if (plan.productionPriorities.status === 'inferred') score += 20 * 0.4;

  // 3. knownAssets (20)
  // Evaluaremos basado en si existen activos conocidos
  if (plan.knownAssets.length > 0) {
    const allKnownConfirmed = plan.knownAssets.every(a => a.status === 'confirmed');
    score += allKnownConfirmed ? 20 : 20 * 0.4;
  }

  // 4. assetDependencies (15)
  if (plan.assetDependencies.length === 0) {
    score += 15;
  } else {
    const allResolved = plan.assetDependencies.every(d => d.status === 'resolved');
    score += allResolved ? 15 : 15 * 0.4;
  }

  // 5. contentRisks (10)
  if (plan.contentRisks.length === 0) {
    score += 10;
  } else {
    const allMitigated = plan.contentRisks.every(r => r.mitigationStatus !== 'unmitigated');
    score += allMitigated ? 10 : 10 * 0.4;
  }

  // 6. productionInputs (10)
  if (plan.productionInputs.length > 0) {
    const allInputsReady = plan.productionInputs.every(i => i.isReady);
    const allInputsInferred = plan.productionInputs.every(i => i.status !== 'missing');
    if (allInputsReady) score += 10;
    else if (allInputsInferred) score += 10 * 0.4;
  }

  score = Math.round(score);

  let reason = 'El plan de contenido está listo para producción.';
  if (plan.isBlocked) {
    reason = 'El plan tiene dependencias críticas bloqueadas.';
  } else if (score < 100) {
    reason = 'Faltan definiciones críticas para asegurar una producción fluida.';
  }
  if (!plan.isBlocked && score < 50) {
    reason = 'El plan de contenido requiere validación ejecutiva urgente antes de iniciar producción.';
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason,
    isBlocked: plan.isBlocked
  };
}
