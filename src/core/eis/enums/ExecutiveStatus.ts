export const ExecutiveStatus = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ExecutiveStatus = (typeof ExecutiveStatus)[keyof typeof ExecutiveStatus];
