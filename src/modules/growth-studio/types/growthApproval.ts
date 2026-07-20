// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Approval
// ─────────────────────────────────────────────────────────────

/**
 * Approval decision status.
 *
 * pending           → Awaiting reviewer decision.
 * approved          → Approved by authorized reviewer.
 * rejected          → Rejected by reviewer.
 * changes_requested → Reviewer requested changes before approval.
 */
export type GrowthApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

/**
 * The type of entity being approved.
 */
export type ApprovableEntityType =
  | 'campaign'
  | 'content_piece'
  | 'objective';

/**
 * Represents an approval record for Growth Studio entities.
 *
 * Every campaign must reference a valid GrowthApproval before
 * transitioning to 'approved', 'scheduled', or 'published'.
 */
export interface GrowthApproval {
  /** Unique identifier. */
  readonly id: string;

  /** Tenant that owns this approval. */
  readonly tenantId: string;

  /** Company within the tenant. */
  readonly companyId: string;

  /** Type of entity being approved. */
  entityType: ApprovableEntityType;

  /** ID of the entity under approval. */
  entityId: string;

  /** Current approval status. */
  status: GrowthApprovalStatus;

  /** User who requested the approval. */
  readonly requestedBy: string;

  /** User who reviewed the approval (null if pending). */
  reviewedBy: string | null;

  /** Reviewer's comment or justification. */
  reviewerComment: string | null;

  /** ISO 8601 timestamp when the decision was made. */
  decidedAt: string | null;

  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

