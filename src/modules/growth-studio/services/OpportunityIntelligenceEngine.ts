import type {
  GrowthNextBestAction,
  GrowthOpportunityIntelligence,
  GrowthOpportunityPriority,
  GrowthOpportunitySignal,
  GrowthOpportunitySignalType,
} from '../types/growthOpportunity';

const SIGNAL_WEIGHTS: Readonly<
  Partial<Record<GrowthOpportunitySignalType, number>>
> = {
  fit: 0.3,
  intent: 0.3,
  engagement: 0.2,
  timing: 0.2,
};

const clampScore = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const weightedStrength = (
  signals: GrowthOpportunitySignal[],
): number => {
  let weightedTotal = 0;
  let activeWeight = 0;

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.type];

    if (weight === undefined) {
      continue;
    }

    weightedTotal += clampScore(signal.strength) * weight;
    activeWeight += weight;
  }

  if (activeWeight === 0) {
    return 0;
  }

  return clampScore(weightedTotal / activeWeight);
};

export const priorityFromOpportunityScore = (
  score: number,
): GrowthOpportunityPriority => {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= 85) {
    return 'critical';
  }

  if (normalizedScore >= 70) {
    return 'high';
  }

  if (normalizedScore >= 45) {
    return 'medium';
  }

  return 'low';
};

const buildNextBestAction = (
  score: number,
  signals: GrowthOpportunitySignal[],
): GrowthNextBestAction | null => {
  if (signals.length === 0) {
    return null;
  }

  const priority =
    priorityFromOpportunityScore(score);

  if (score >= 85) {
    return {
      title: 'Contactar ahora',
      description:
        'La oportunidad presenta señales fuertes de ajuste e intención. Prioriza contacto comercial directo.',
      priority,
    };
  }

  if (score >= 70) {
    return {
      title: 'Preparar acercamiento personalizado',
      description:
        'Existe potencial alto. Utiliza las señales disponibles para construir un mensaje relevante.',
      priority,
    };
  }

  if (score >= 45) {
    return {
      title: 'Nutrir la oportunidad',
      description:
        'Mantén seguimiento y genera nuevas señales antes de escalar el esfuerzo comercial.',
      priority,
    };
  }

  return {
    title: 'Obtener más evidencia',
    description:
      'La evidencia actual es insuficiente para priorizar una acción comercial intensiva.',
    priority,
  };
};

export interface OpportunityIntelligenceInput {
  signals: GrowthOpportunitySignal[];
}

export const evaluateOpportunityIntelligence = (
  input: OpportunityIntelligenceInput,
): GrowthOpportunityIntelligence => {
  const score =
    weightedStrength(input.signals);

  const confidence =
    clampScore(
      Math.min(
        100,
        input.signals.length * 20,
      ),
    );

  const priority =
    priorityFromOpportunityScore(score);

  const rationale =
    input.signals.length === 0
      ? 'No hay señales suficientes para evaluar esta oportunidad.'
      : `Aura evaluó ${input.signals.length} señal(es). La oportunidad tiene prioridad ${priority} con un score de ${score}/100.`;

  return {
    score,
    confidence,
    rationale,
    signals: [...input.signals],
    nextBestAction:
      buildNextBestAction(
        score,
        input.signals,
      ),
  };
};
