export const ExecutivePriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type ExecutivePriority = (typeof ExecutivePriority)[keyof typeof ExecutivePriority];
