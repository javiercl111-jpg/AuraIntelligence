export const ExecutiveRiskSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type ExecutiveRiskSeverity =
  (typeof ExecutiveRiskSeverity)[keyof typeof ExecutiveRiskSeverity];
