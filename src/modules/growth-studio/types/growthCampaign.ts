// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Campaign
// ─────────────────────────────────────────────────────────────

/**
 * Full lifecycle status for a growth campaign.
 *
 * draft             → Campaign created as a draft.
 * pending_approval  → Campaign submitted for approval.
 * approved          → Campaign approved (requires valid approvalId).
 * changes_requested → Approver requested changes.
 * rejected          → Campaign rejected.
 * scheduled         → Campaign approved and scheduled for publication.
 * published         → Campaign published (requires valid approvalId).
 * archived          → Campaign archived for historical reference.
 */
export type GrowthCampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'scheduled'
  | 'published'
  | 'archived';

/**
 * Channel where the campaign content will be published.
 */
export type PublicationChannel =
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'email'
  | 'blog'
  | 'other';

/**
 * A single content piece within a campaign.
 */
export interface CampaignContentPiece {
  /** Unique identifier for this content piece. */
  readonly id: string;

  /** Target channel for publication. */
  channel: PublicationChannel;

  /** Content body. */
  body: string;

  /** Optional headline. */
  headline?: string;

  /** Optional call-to-action text. */
  callToAction?: string;

  /** Optional media asset references (URLs or asset IDs). */
  mediaRefs: string[];

  /** Content generation metadata. */
  generatedBy: 'ai' | 'manual' | 'hybrid';
}

/**
 * Schedule configuration for campaign publication.
 */
export interface CampaignSchedule {
  /** ISO 8601 scheduled publication timestamp. */
  scheduledAt: string;

  /** Timezone for the schedule. */
  timezone: string;
}

/**
 * Represents a growth campaign generated from an objective.
 *
 * INVARIANT: `approvalId` MUST be set when status is
 * 'approved', 'scheduled', or 'published'.
 */
export interface GrowthCampaign {
  /** Unique identifier. */
  readonly id: string;

  /** Tenant that owns this campaign. */
  readonly tenantId: string;

  /** Company within the tenant. */
  readonly companyId: string;

  /** Objective that originated this campaign. */
  readonly objectiveId: string;

  /** User who created the campaign. */
  readonly createdBy: string;

  /** Current lifecycle status. */
  status: GrowthCampaignStatus;

  /** Campaign title. */
  title: string;

  /** Campaign description or brief. */
  description: string;

  /** Target channels. */
  channels: PublicationChannel[];

  /** Content pieces for this campaign. */
  contentPieces: CampaignContentPiece[];

  /** Schedule, if campaign is scheduled. */
  schedule: CampaignSchedule | null;

  /**
   * ID of the approval record that authorized this campaign.
   * MUST be non-null when status is 'approved', 'scheduled', or 'published'.
   */
  approvalId: string | null;

  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

