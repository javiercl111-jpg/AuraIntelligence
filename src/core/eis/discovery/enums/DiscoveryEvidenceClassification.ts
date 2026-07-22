export const DiscoveryEvidenceClassification = {
  USER_CONFIRMED: 'USER_CONFIRMED',
  INFERRED: 'INFERRED',
  SYSTEM_OBSERVED: 'SYSTEM_OBSERVED',
  MISSING: 'MISSING',
} as const;

export type DiscoveryEvidenceClassification =
  (typeof DiscoveryEvidenceClassification)[keyof typeof DiscoveryEvidenceClassification];
