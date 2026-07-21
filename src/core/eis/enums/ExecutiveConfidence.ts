export const ExecutiveConfidence = {
  VERY_HIGH: 'VERY_HIGH',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type ExecutiveConfidence = (typeof ExecutiveConfidence)[keyof typeof ExecutiveConfidence];
