// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Analytics (Initial Contract)
// ─────────────────────────────────────────────────────────────

/**
 * Time range for analytics queries.
 */
export interface AnalyticsTimeRange {
  /** ISO 8601 start timestamp. */
  from: string;

  /** ISO 8601 end timestamp. */
  to: string;
}

/**
 * Metric type identifiers for growth analytics.
 */
export type GrowthMetricType =
  | 'objectives_created'
  | 'objectives_completed'
  | 'campaigns_published'
  | 'campaigns_approved'
  | 'campaigns_rejected'
  | 'conversations_completed'
  | 'conversations_abandoned'
  | 'approval_turnaround_hours';

/**
 * A single analytics data point.
 */
export interface GrowthMetricDataPoint {
  /** Metric identifier. */
  metric: GrowthMetricType;

  /** Numeric value. */
  value: number;

  /** ISO 8601 timestamp for this data point. */
  timestamp: string;
}

/**
 * Analytics summary for a Growth Studio workspace.
 *
 * NOTE: This is an initial contract definition.
 * Functional implementation is deferred to a future sprint.
 */
export interface GrowthAnalyticsSummary {
  /** Tenant context. */
  readonly tenantId: string;

  /** Company context. */
  readonly companyId: string;

  /** Time range this summary covers. */
  timeRange: AnalyticsTimeRange;

  /** Aggregated data points. */
  metrics: GrowthMetricDataPoint[];

  /** ISO 8601 timestamp when this summary was generated. */
  readonly generatedAt: string;
}

