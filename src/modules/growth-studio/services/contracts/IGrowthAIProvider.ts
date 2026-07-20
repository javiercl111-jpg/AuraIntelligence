// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — IGrowthAIProvider Contract
// ─────────────────────────────────────────────────────────────

import type { GrowthStructuredContext } from '../../types/growthConversation';

/**
 * AI-generated response for a conversation turn.
 */
export interface AIConversationResponse {
  /** The AI's response content. */
  readonly content: string;

  /** Data extracted from the user's input, if any. */
  readonly extractedData: Record<string, unknown> | null;

  /** Suggested next stage, if the AI recommends advancing. */
  readonly suggestedNextStage: string | null;

  /** Confidence in the response (0-1). */
  readonly confidence: number;
}

/**
 * AI-generated campaign content.
 */
export interface AIGeneratedContent {
  /** Generated headline. */
  readonly headline: string;

  /** Generated body content. */
  readonly body: string;

  /** Generated call-to-action. */
  readonly callToAction: string;

  /** Suggested media descriptions. */
  readonly suggestedMedia: string[];
}

/**
 * Parameters for generating a conversation response.
 */
export interface GenerateConversationResponseParams {
  /** Current structured context. */
  readonly context: GrowthStructuredContext;

  /** The user's latest message. */
  readonly userMessage: string;

  /** Current conversation stage. */
  readonly currentStage: string;

  /** Previous turns for context (limited window). */
  readonly previousTurns: ReadonlyArray<{
    readonly role: string;
    readonly content: string;
  }>;
}

/**
 * Parameters for generating campaign content.
 */
export interface GenerateCampaignContentParams {
  /** Objective description. */
  readonly objective: string;

  /** Target audience. */
  readonly audience: string;

  /** Target channel. */
  readonly channel: string;

  /** Brand tone to use. */
  readonly brandTone: string;

  /** Brand values to align with. */
  readonly brandValues: readonly string[];
}

/**
 * Contract for AI capabilities used by Growth Studio.
 *
 * This provider is intentionally DECOUPLED from any specific
 * AI vendor (OpenAI, Gemini, etc.). Implementations will be
 * injected in future sprints.
 *
 * NO IMPLEMENTATION EXISTS IN THIS SPRINT.
 */
export interface IGrowthAIProvider {
  /**
   * Generate an AI response for an executive conversation turn.
   */
  generateConversationResponse(
    params: GenerateConversationResponseParams,
  ): Promise<AIConversationResponse>;

  /**
   * Generate campaign content for a specific channel.
   */
  generateCampaignContent(
    params: GenerateCampaignContentParams,
  ): Promise<AIGeneratedContent>;

  /**
   * Check whether the AI provider is available and configured.
   */
  isAvailable(): Promise<boolean>;
}


