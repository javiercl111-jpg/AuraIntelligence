// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Capabilities Registry
// ─────────────────────────────────────────────────────────────

/**
 * All capability keys recognized by Aura Growth Studio.
 *
 * These will be used in the future for RBAC and workspace
 * feature gating. For now they serve as typed constants.
 */
export type GrowthCapabilityKey =
  | 'growth_studio.access'
  | 'growth_studio.conversation.use'
  | 'growth_studio.objective.create'
  | 'growth_studio.brand_brain.read'
  | 'growth_studio.campaign.generate'
  | 'growth_studio.campaign.approve'
  | 'growth_studio.content.publish';

/**
 * Capability definition with metadata.
 */
export interface GrowthCapability {
  /** Unique key for this capability. */
  readonly key: GrowthCapabilityKey;

  /** Human-readable name. */
  readonly name: string;

  /** Description of what this capability allows. */
  readonly description: string;
}

/**
 * All Growth Studio capabilities.
 * Not enforced yet — serves as the definitive registry.
 */
export const GROWTH_STUDIO_CAPABILITIES: readonly GrowthCapability[] = [
  {
    key: 'growth_studio.access',
    name: 'Growth Studio Access',
    description: 'Basic access to Aura Growth Studio workspace.',
  },
  {
    key: 'growth_studio.conversation.use',
    name: 'Executive Conversation',
    description: 'Ability to initiate and participate in executive growth conversations.',
  },
  {
    key: 'growth_studio.objective.create',
    name: 'Create Objectives',
    description: 'Ability to create and manage growth objectives.',
  },
  {
    key: 'growth_studio.brand_brain.read',
    name: 'Read Brand Brain',
    description: 'Ability to view and query the Brand Brain profile.',
  },
  {
    key: 'growth_studio.campaign.generate',
    name: 'Generate Campaigns',
    description: 'Ability to generate campaign drafts from objectives.',
  },
  {
    key: 'growth_studio.campaign.approve',
    name: 'Approve Campaigns',
    description: 'Ability to approve, reject, or request changes on campaigns.',
  },
  {
    key: 'growth_studio.content.publish',
    name: 'Publish Content',
    description: 'Ability to publish approved content to external channels.',
  },
] as const;

export default GROWTH_STUDIO_CAPABILITIES;
