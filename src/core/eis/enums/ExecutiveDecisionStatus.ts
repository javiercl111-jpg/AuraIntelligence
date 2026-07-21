export const ExecutiveDecisionStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  RETURNED: 'RETURNED',
  REJECTED: 'REJECTED',
} as const;

export type ExecutiveDecisionStatus = (typeof ExecutiveDecisionStatus)[keyof typeof ExecutiveDecisionStatus];
