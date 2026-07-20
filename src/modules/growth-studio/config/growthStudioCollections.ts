// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Firestore Collection Constants
// ─────────────────────────────────────────────────────────────

/**
 * Firestore collection names for Growth Studio entities.
 *
 * IMPORTANT: These are constants ONLY. No Firestore services,
 * document writes, or rules modifications are implemented
 * in this sprint. These exist solely to define the data
 * architecture and prevent magic strings in future sprints.
 */
export const GROWTH_COLLECTIONS = {
  /** Executive growth conversations. */
  CONVERSATIONS: 'growth_conversations',

  /** Growth objectives extracted from conversations. */
  OBJECTIVES: 'growth_objectives',

  /** Generated growth campaigns. */
  CAMPAIGNS: 'growth_campaigns',

  /** Brand Brain profiles per company. */
  BRAND_BRAIN_PROFILES: 'brand_brain_profiles',

  /** Approval records for campaigns and content. */
  APPROVALS: 'growth_approvals',

  /** Audit log of all Growth Studio operations. */
  AUDIT_LOG: 'growth_audit_log',
} as const;

/**
 * Type helper for collection name values.
 */
export type GrowthCollectionName =
  (typeof GROWTH_COLLECTIONS)[keyof typeof GROWTH_COLLECTIONS];

export default GROWTH_COLLECTIONS;
