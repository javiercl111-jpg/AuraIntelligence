// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Conversation
// ─────────────────────────────────────────────────────────────

/**
 * Conversation status.
 *
 * active    → Conversation is in progress.
 * completed → Conversation concluded and produced output.
 * abandoned → Conversation was abandoned before completion.
 */
export type GrowthConversationStatus =
  | 'active'
  | 'completed'
  | 'abandoned';

/**
 * Ordered stages of an executive growth conversation.
 * Each stage represents a phase of strategic discovery.
 */
export type GrowthConversationStage =
  | 'welcome'
  | 'understanding_objective'
  | 'understanding_product'
  | 'understanding_audience'
  | 'understanding_region'
  | 'understanding_result'
  | 'executive_reflection'
  | 'executive_proposal'
  | 'approval'
  | 'completed';

/**
 * Role of a conversation participant.
 */
export type ConversationRole = 'user' | 'assistant' | 'system';

/**
 * Structured context extracted progressively
 * during the conversation stages.
 */
export interface GrowthStructuredContext {
  /** Extracted objective summary. */
  objective?: string;

  /** Extracted audience description. */
  audience?: string;

  /** Extracted region or market. */
  region?: string;

  /** Extracted expected result. */
  expectedResult?: string;

  /** Extracted budget or financial constraints. */
  budget?: string;

  /** Extracted constraints. */
  constraints?: string[];

  /** Extracted product or service. */
  productOrService?: string;

  /** Any additional key-value data extracted by AI. */
  additionalData?: Record<string, unknown>;
}

/**
 * Represents an executive growth conversation session.
 */
export interface GrowthConversation {
  /** Unique identifier. */
  readonly id: string;

  /** Tenant that owns this conversation. */
  readonly tenantId: string;

  /** Company within the tenant. */
  readonly companyId: string;

  /** User who initiated the conversation. */
  readonly userId: string;

  /** Associated objective, if created. */
  objectiveId: string | null;

  /** Current status. */
  status: GrowthConversationStatus;

  /** Current stage of the conversation flow. */
  currentStage: GrowthConversationStage;

  /** Progressive structured context extracted from turns. */
  structuredContext: GrowthStructuredContext;

  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

/**
 * Data that can be extracted from an individual turn.
 */
export interface TurnExtractedData {
  /** Stage the extraction relates to. */
  stage: GrowthConversationStage;

  /** Key-value pairs of extracted information. */
  data: Record<string, unknown>;
}

/**
 * Represents a single turn in a growth conversation.
 */
export interface GrowthConversationTurn {
  /** Unique identifier. */
  readonly id: string;

  /** Parent conversation ID. */
  readonly conversationId: string;

  /** Role of the message author. */
  role: ConversationRole;

  /** Message content. */
  content: string;

  /** Ordered turn number within the conversation. */
  readonly turnNumber: number;

  /** Structured data extracted from this turn, if any. */
  extractedData: TurnExtractedData | null;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
}

