// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — IGrowthConversationService Contract
// ─────────────────────────────────────────────────────────────

import type { GrowthConversation, GrowthConversationTurn, GrowthConversationStage } from '../../types/growthConversation';

/**
 * Parameters to start a new executive growth conversation.
 */
export interface StartConversationParams {
  readonly tenantId: string;
  readonly companyId: string;
  readonly userId: string;
}

/**
 * Parameters to add a turn to an existing conversation.
 */
export interface AddTurnParams {
  readonly conversationId: string;
  readonly content: string;
  readonly role: 'user' | 'assistant';
}

/**
 * Contract for managing executive growth conversations.
 *
 * Conversations follow a staged flow from welcome through
 * objective extraction and executive proposal.
 */
export interface IGrowthConversationService {
  /**
   * Start a new executive growth conversation.
   * Initial status: 'active', initial stage: 'welcome'.
   */
  startConversation(params: StartConversationParams): Promise<GrowthConversation>;

  /**
   * Retrieve a conversation by ID.
   */
  getConversation(conversationId: string): Promise<GrowthConversation | null>;

  /**
   * Add a turn to an existing conversation.
   */
  addTurn(params: AddTurnParams): Promise<GrowthConversationTurn>;

  /**
   * Advance the conversation to the next stage.
   */
  advanceStage(
    conversationId: string,
    nextStage: GrowthConversationStage,
  ): Promise<GrowthConversation>;

  /**
   * Mark a conversation as completed.
   * Only valid from certain stages.
   */
  completeConversation(conversationId: string): Promise<GrowthConversation>;

  /**
   * Mark a conversation as abandoned.
   */
  abandonConversation(conversationId: string): Promise<GrowthConversation>;

  /**
   * Retrieve all turns for a conversation, ordered by turnNumber.
   */
  getConversationTurns(conversationId: string): Promise<GrowthConversationTurn[]>;
}


