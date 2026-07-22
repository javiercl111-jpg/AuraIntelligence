export const ExecutiveRiskLikelihood = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ExecutiveRiskLikelihood =
  (typeof ExecutiveRiskLikelihood)[keyof typeof ExecutiveRiskLikelihood];
