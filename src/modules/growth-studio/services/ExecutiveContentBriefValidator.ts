import type { ExecutiveContentBrief, BlockingReason } from '../types/executiveContentBrief';
import type { ContentPlan } from '../types/contentPlan';

export function calculateBriefReadiness(brief: ExecutiveContentBrief, plan: ContentPlan | null): { score: number; isBlocked: boolean; blockingReasons: BlockingReason[]; reason: string } {
  const blockingReasons: BlockingReason[] = [];

  // 1. Structural invalidity check
  const hasSelectedAsset = !!brief.selectedAsset;
  const hasAssetPurpose = brief.assetPurpose.status !== 'missing' && !!brief.assetPurpose.value;
  const assetInPlan = plan && brief.selectedAsset ? plan.contentAssets.some(a => a.id === brief.selectedAsset!.assetId) : false;
  const hasEvidence = brief.supportingEvidence.length > 0;

  if (!hasSelectedAsset || !hasAssetPurpose || !assetInPlan || !hasEvidence) {
    if (!hasSelectedAsset) blockingReasons.push({ id: 'no-asset', description: 'No se ha seleccionado un activo.', criticality: 'blocker' });
    if (!hasAssetPurpose) blockingReasons.push({ id: 'no-purpose', description: 'El activo carece de propósito definido.', criticality: 'blocker' });
    if (!assetInPlan && hasSelectedAsset) blockingReasons.push({ id: 'invalid-asset', description: 'El activo seleccionado no existe en el Content Plan.', criticality: 'blocker' });
    if (!hasEvidence) blockingReasons.push({ id: 'no-evidence', description: 'No hay evidencia de origen que respalde el Brief.', criticality: 'blocker' });

    return {
      score: 0,
      isBlocked: true,
      blockingReasons,
      reason: 'El Brief carece de integridad estructural o no está vinculado a un activo válido.'
    };
  }

  let score = 0;

  // coreMessage: 20
  if (brief.coreMessage.status === 'confirmed') score += 20;
  else if (brief.coreMessage.status === 'inferred') score += 20 * 0.4;
  else blockingReasons.push({ id: 'msg-missing', description: 'Falta mensaje central.', criticality: 'blocker' });

  // targetAudience: 15
  if (brief.targetAudience.status === 'confirmed') score += 15;
  else if (brief.targetAudience.status === 'inferred') score += 15 * 0.4;
  else blockingReasons.push({ id: 'aud-missing', description: 'Falta audiencia objetivo.', criticality: 'blocker' });

  // businessContext: 15
  if (brief.businessContext.status === 'confirmed') score += 15;
  else if (brief.businessContext.status === 'inferred') score += 15 * 0.4;

  // brandGuidelinesAndTone: 15
  let brandScore = 0;
  if (brief.brandGuidelines.status === 'confirmed') brandScore += 7.5;
  else if (brief.brandGuidelines.status === 'inferred') brandScore += 7.5 * 0.4;

  if (brief.tone.status === 'confirmed') brandScore += 7.5;
  else if (brief.tone.status === 'inferred') brandScore += 7.5 * 0.4;
  score += brandScore;

  // constraints: 15
  if (brief.constraints.length > 0) {
    const allConfirmed = brief.constraints.every(c => c.status === 'confirmed');
    score += allConfirmed ? 15 : 15 * 0.4;
  }

  // successCriteria: 10
  if (brief.successCriteria.length > 0) {
    const allConfirmed = brief.successCriteria.every(c => c.status === 'confirmed');
    score += allConfirmed ? 10 : 10 * 0.4;
  }

  // supportingEvidence: 10
  if (brief.supportingEvidence.length > 0) {
    const allConfirmed = brief.supportingEvidence.every(c => c.status === 'confirmed');
    score += allConfirmed ? 10 : 10 * 0.4;
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const isBlocked = blockingReasons.some(r => r.criticality === 'blocker');

  let reason = 'El Brief está listo para enviarse a producción.';
  if (isBlocked) {
    reason = 'El Brief está bloqueado por insumos críticos faltantes.';
  } else if (score < 100) {
    reason = 'El Brief tiene la base mínima pero puede mejorarse para mayor precisión.';
  }

  return {
    score,
    isBlocked,
    blockingReasons,
    reason
  };
}
