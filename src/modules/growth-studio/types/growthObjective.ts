// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Objective
// ─────────────────────────────────────────────────────────────

/**
 * Status lifecycle for a Growth Objective.
 *
 * draft     → Objective created but not yet validated.
 * active    → Objective confirmed and in execution.
 * completed → Objective reached or closed successfully.
 * archived  → Objective archived for historical reference.
 */
export type GrowthObjectiveStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'archived';

/**
 * Status of a specific field within the objective.
 */
export type GrowthObjectiveFieldStatus = 'confirmed' | 'inferred' | 'missing';

/**
 * Time horizon for the growth objective.
 */
export type GrowthHorizon =
  | 'immediate'
  | 'short_term'
  | 'medium_term'
  | 'long_term';

/**
 * Confidence level assigned by AI or the executive.
 */
export type ConfidenceLevel =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

/**
 * Represents a structured growth objective created through
 * an executive conversation in Aura Growth Studio.
 */
export interface GrowthObjective {
  /** Unique identifier. */
  readonly id: string;

  /** Tenant that owns this objective. */
  readonly tenantId: string;

  /** Company within the tenant. */
  readonly companyId: string;

  /** User who created the objective. */
  readonly createdBy: string;

  /** Current lifecycle status. */
  status: GrowthObjectiveStatus;

  /** High-level growth goal description. */
  goal: string;

  /** Product or service this objective targets. */
  productOrService: string;

  /** Target audience description. */
  audience: string;

  /** Geographic region or market. */
  region: string;

  /** Time horizon for this objective. */
  horizon: GrowthHorizon;

  /** Expected measurable result. */
  expectedResult: string;

  /** Estimated budget if any. */
  budget?: string;

  /** Known constraints or limitations. */
  constraints: string[];

  /** AI or executive confidence in this objective. */
  confidence: ConfidenceLevel;

  /** Completeness percentage (0-100). */
  completionPercentage?: number;

  /** List of field names that are missing. */
  missingFields?: string[];

  /** List of field names that are confirmed by the user. */
  confirmedFields?: string[];

  /** List of field names that are inferred by AI. */
  inferredFields?: string[];

  /** List of critical validation errors. */
  validationErrors?: string[];

  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

