// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — IBrandBrainService Contract
// ─────────────────────────────────────────────────────────────

import type { BrandBrain } from '../../types/brandBrain';

/**
 * Contract for managing Brand Brain profiles.
 *
 * Brand Brain stores and serves the organization's brand
 * knowledge to AI generation services.
 */
export interface IBrandBrainService {
  /**
   * Retrieves a Brand Brain by ID.
   */
  getProfile(id: string): Promise<BrandBrain | null>;

  /**
   * Retrieves a Brand Brain by Conversation ID.
   */
  getBrandBrainByConversation(conversationId: string): Promise<BrandBrain | null>;

  /**
   * Generates or updates a Brand Brain from a set of structured conversation context.
   */
  buildBrandBrain(
    conversationId: string,
    context: Record<string, unknown>,
    explicitConfirmations?: Record<string, boolean>
  ): Promise<BrandBrain>;

  /**
   * Check whether a Brand Brain exists for a conversation.
   */
  hasProfile(conversationId: string): Promise<boolean>;
}
