export const ExecutiveConfidenceLevel = {
  VERY_HIGH: 'VERY_HIGH',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type ExecutiveConfidenceLevel =
  (typeof ExecutiveConfidenceLevel)[keyof typeof ExecutiveConfidenceLevel];
