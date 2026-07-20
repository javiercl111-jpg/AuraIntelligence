// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — IPublisherService Contract
// ─────────────────────────────────────────────────────────────

import type { CampaignContentPiece, PublicationChannel } from '../../types/growthCampaign';

/**
 * Result of publishing a single content piece.
 */
export interface PublishResult {
  /** Content piece ID. */
  readonly contentPieceId: string;

  /** Channel it was published to. */
  readonly channel: PublicationChannel;

  /** Whether publication succeeded. */
  readonly success: boolean;

  /** External platform post ID, if available. */
  readonly externalId: string | null;

  /** Error message, if publication failed. */
  readonly error: string | null;

  /** ISO 8601 timestamp of publication. */
  readonly publishedAt: string;
}

/**
 * Parameters to publish content.
 */
export interface PublishContentParams {
  /** The campaign ID for audit. */
  readonly campaignId: string;

  /**
   * Approval ID that authorized this publication.
   * MUST be a valid, approved approval record.
   */
  readonly approvalId: string;

  /** Content pieces to publish. */
  readonly contentPieces: readonly CampaignContentPiece[];
}

/**
 * Contract for publishing approved content to external channels.
 *
 * INVARIANT: The publisher MUST verify that approvalId is valid
 * before executing any publication. No content may be published
 * without prior approval.
 */
export interface IPublisherService {
  /**
   * Publish approved content pieces to their target channels.
   *
   * @throws if approvalId is invalid or not approved.
   */
  publish(params: PublishContentParams): Promise<PublishResult[]>;

  /**
   * Check connectivity and credentials for a specific channel.
   */
  validateChannel(channel: PublicationChannel): Promise<boolean>;

  /**
   * List supported publication channels.
   */
  getSupportedChannels(): PublicationChannel[];
}


