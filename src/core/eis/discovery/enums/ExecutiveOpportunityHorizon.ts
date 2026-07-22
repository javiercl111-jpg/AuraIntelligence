export const ExecutiveOpportunityHorizon = {
  NEAR_TERM: 'NEAR_TERM',
  MEDIUM_TERM: 'MEDIUM_TERM',
  LONG_TERM: 'LONG_TERM',
} as const;

export type ExecutiveOpportunityHorizon =
  (typeof ExecutiveOpportunityHorizon)[keyof typeof ExecutiveOpportunityHorizon];
