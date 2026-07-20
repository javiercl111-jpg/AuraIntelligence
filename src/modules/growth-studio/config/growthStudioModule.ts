// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Module Definition
// ─────────────────────────────────────────────────────────────

import type { GrowthCapabilityKey } from './growthStudioCapabilities';

/**
 * Module status indicating the current maturity level.
 */
export type GrowthModuleStatus =
  | 'foundation'
  | 'alpha'
  | 'beta'
  | 'stable'
  | 'deprecated';

/**
 * Definition of the Growth Studio module within the Aura ecosystem.
 */
export interface GrowthStudioModuleConfig {
  /** Unique module identifier. */
  readonly id: string;

  /** Internal module name. */
  readonly name: string;

  /** User-facing product name. */
  readonly productName: string;

  /** Module subtitle. */
  readonly subtitle: string;

  /** Current module version (semver). */
  readonly version: string;

  /** Current module maturity status. */
  readonly status: GrowthModuleStatus;

  /** Capabilities this module provides. */
  readonly capabilities: readonly GrowthCapabilityKey[];

  /** Module dependencies within Aura ecosystem. */
  readonly dependencies: readonly string[];

  /** Feature flag key that controls this module. */
  readonly featureFlag: string;

  /** Data schema version for persistence contracts. */
  readonly schemaVersion: number;
}

/**
 * The canonical module definition for Aura Growth Studio.
 */
export const GrowthStudioModuleDefinition: GrowthStudioModuleConfig = {
  id: 'growth_studio',
  name: 'Aura Growth Studio',
  productName: 'Aura Growth Studio™',
  subtitle: 'AI Growth Operating System',
  version: '0.0.1',
  status: 'foundation',
  capabilities: [
    'growth_studio.access',
    'growth_studio.conversation.use',
    'growth_studio.objective.create',
    'growth_studio.brand_brain.read',
    'growth_studio.campaign.generate',
    'growth_studio.campaign.approve',
    'growth_studio.content.publish',
  ],
  dependencies: [
    'firebase/auth',
    'firebase/firestore',
  ],
  featureFlag: 'growth_studio.enabled',
  schemaVersion: 1,
} as const;

export default GrowthStudioModuleDefinition;
