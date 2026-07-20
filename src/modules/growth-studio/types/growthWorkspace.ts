// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Workspace
// ─────────────────────────────────────────────────────────────

import type { GrowthCapabilityKey } from '../config/growthStudioCapabilities';

/**
 * Workspace activation status.
 */
export type GrowthWorkspaceStatus =
  | 'active'
  | 'inactive'
  | 'provisioning'
  | 'suspended';

/**
 * Represents a Growth Studio workspace for a specific tenant/company.
 * Controls which capabilities are enabled for this workspace.
 */
export interface GrowthWorkspace {
  /** Unique identifier. */
  readonly id: string;

  /** Tenant that owns this workspace. */
  readonly tenantId: string;

  /** Company within the tenant. */
  readonly companyId: string;

  /** Current workspace status. */
  status: GrowthWorkspaceStatus;

  /** Capabilities enabled for this workspace. */
  enabledCapabilities: GrowthCapabilityKey[];

  /** Display name for this workspace. */
  displayName: string;

  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

