export const ExecutiveActionStatus = {
  PROPOSED: 'PROPOSED',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISMISSED: 'DISMISSED',
} as const;

export type ExecutiveActionStatus =
  (typeof ExecutiveActionStatus)[keyof typeof ExecutiveActionStatus];
