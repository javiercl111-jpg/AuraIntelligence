export const DiscoveryEvidenceSourceType = {
  USER_RESPONSE: 'USER_RESPONSE',
  CONVERSATION_TURN: 'CONVERSATION_TURN',
  ORGANIZATION_PROFILE: 'ORGANIZATION_PROFILE',
  STRUCTURED_FIELD: 'STRUCTURED_FIELD',
  DOCUMENT_REFERENCE: 'DOCUMENT_REFERENCE',
  SYSTEM_OBSERVATION: 'SYSTEM_OBSERVATION',
} as const;

export type DiscoveryEvidenceSourceType =
  (typeof DiscoveryEvidenceSourceType)[keyof typeof DiscoveryEvidenceSourceType];
