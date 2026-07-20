// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — ICampaignService Contract
// ─────────────────────────────────────────────────────────────

import type { GrowthCampaign, PublicationChannel } from '../../types/growthCampaign';

/**
 * Parameters to create a campaign draft.
 */
export interface CreateCampaignDraftParams {
  readonly tenantId: string;
  readonly companyId: string;
  readonly objectiveId: string;
  readonly createdBy: string;
  readonly title: string;
  readonly description: string;
  readonly channels: PublicationChannel[];
}

/**
 * Parameters to submit a campaign for approval.
 */
export interface RequestCampaignApprovalParams {
  readonly campaignId: string;
  readonly requestedBy: string;
}

/**
 * Result of a publish operation.
 */
export interface PublishCampaignResult {
  readonly campaignId: string;
  readonly publishedAt: string;
  readonly success: boolean;
  readonly errors: string[];
}

/**
 * Contract for managing growth campaign lifecycle.
 *
 * The lifecycle enforces strict separation:
 *   createDraft → requestApproval → (approve via IGrowthApprovalService) → publish
 *
 * INVARIANT: A campaign CANNOT be published without a valid
 * approvalId referencing an approved GrowthApproval record.
 */
export interface ICampaignService {
  /**
   * Create a new campaign draft.
   * Initial status: 'draft'. No approvalId set.
   */
  createDraft(params: CreateCampaignDraftParams): Promise<GrowthCampaign>;

  /**
   * Retrieve a campaign by ID.
   */
  getCampaign(campaignId: string): Promise<GrowthCampaign | null>;

  /**
   * Submit a draft campaign for approval.
   * Transitions status from 'draft' to 'pending_approval'.
   *
   * @throws if campaign is not in 'draft' status.
   */
  requestApproval(params: RequestCampaignApprovalParams): Promise<GrowthCampaign>;

  /**
   * Mark a campaign as approved with a valid approval reference.
   * Transitions status from 'pending_approval' to 'approved'.
   *
   * @param campaignId - Campaign to approve.
   * @param approvalId - ID of the GrowthApproval record (MUST be valid).
   * @throws if campaign is not in 'pending_approval' status.
   * @throws if approvalId is empty or invalid.
   */
  markApproved(campaignId: string, approvalId: string): Promise<GrowthCampaign>;

  /**
   * Publish an approved campaign.
   * Transitions status from 'approved' or 'scheduled' to 'published'.
   *
   * @throws if campaign is not in 'approved' or 'scheduled' status.
   * @throws if campaign.approvalId is null (no prior approval).
   */
  publish(campaignId: string): Promise<PublishCampaignResult>;

  /**
   * Archive a campaign.
   */
  archive(campaignId: string): Promise<GrowthCampaign>;

  /**
   * List campaigns for a given objective.
   */
  listByObjective(objectiveId: string): Promise<GrowthCampaign[]>;
}


