// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — IGrowthApprovalService Contract
// ─────────────────────────────────────────────────────────────

import type { GrowthApproval, ApprovableEntityType } from '../../types/growthApproval';

/**
 * Parameters to request a new approval.
 */
export interface RequestApprovalParams {
  readonly tenantId: string;
  readonly companyId: string;
  readonly entityType: ApprovableEntityType;
  readonly entityId: string;
  readonly requestedBy: string;
}

/**
 * Parameters for an approval decision.
 */
export interface ApprovalDecisionParams {
  readonly approvalId: string;
  readonly reviewedBy: string;
  readonly decision: 'approved' | 'rejected' | 'changes_requested';
  readonly comment: string;
}

/**
 * Contract for managing approval workflows.
 *
 * Approvals are the gate between drafts and publication.
 * No entity can reach 'approved' or 'published' status
 * without a corresponding approval record.
 */
export interface IGrowthApprovalService {
  /**
   * Request approval for an entity.
   * Creates a new approval record with status 'pending'.
   */
  requestApproval(params: RequestApprovalParams): Promise<GrowthApproval>;

  /**
   * Retrieve an approval record by ID.
   */
  getApproval(approvalId: string): Promise<GrowthApproval | null>;

  /**
   * Record an approval decision (approve, reject, or request changes).
   *
   * @throws if approval is not in 'pending' status.
   */
  decide(params: ApprovalDecisionParams): Promise<GrowthApproval>;

  /**
   * List all approvals for a specific entity.
   */
  listByEntity(
    entityType: ApprovableEntityType,
    entityId: string,
  ): Promise<GrowthApproval[]>;

  /**
   * List pending approvals for a reviewer.
   */
  listPendingForReviewer(
    tenantId: string,
    companyId: string,
  ): Promise<GrowthApproval[]>;

  /**
   * Validate that an approval ID references a valid,
   * approved record. Used before allowing publish.
   */
  validateApproval(approvalId: string): Promise<boolean>;
}


