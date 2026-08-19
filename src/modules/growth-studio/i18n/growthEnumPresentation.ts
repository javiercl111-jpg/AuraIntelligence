export interface GrowthEnumPresentationMessages {
  statusConfirmed: string;
  statusInferred: string;
  statusMissing: string;
  statusApproved: string;
  statusReviewRequired: string;
  statusDraft: string;
  statusCompleted: string;

  priorityCritical: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;

  severityCritical: string;
  severityHigh: string;
  severityMedium: string;
  severityLow: string;

  impactHigh: string;
  impactMedium: string;
  impactLow: string;

  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;

  mitigationPlanned: string;
  mitigationActive: string;
  mitigationUnmitigated: string;

  criticalityBlocker: string;
  criticalityHigh: string;
  criticalityMedium: string;
  criticalityLow: string;

  unknown: string;
}

export type GrowthEnumPresentationKind =
  | 'status'
  | 'priority'
  | 'severity'
  | 'impact'
  | 'confidence'
  | 'mitigation'
  | 'criticality';

const enumPresentationKeyMap = {
  status: {
    confirmed: 'statusConfirmed',
    inferred: 'statusInferred',
    missing: 'statusMissing',
    approved: 'statusApproved',
    review_required: 'statusReviewRequired',
    draft: 'statusDraft',
    completed: 'statusCompleted',
  },
  priority: {
    critical: 'priorityCritical',
    high: 'priorityHigh',
    medium: 'priorityMedium',
    low: 'priorityLow',
  },
  severity: {
    critical: 'severityCritical',
    high: 'severityHigh',
    medium: 'severityMedium',
    low: 'severityLow',
  },
  impact: {
    high: 'impactHigh',
    medium: 'impactMedium',
    low: 'impactLow',
  },
  confidence: {
    high: 'confidenceHigh',
    medium: 'confidenceMedium',
    low: 'confidenceLow',
  },
  mitigation: {
    planned: 'mitigationPlanned',
    active: 'mitigationActive',
    unmitigated: 'mitigationUnmitigated',
  },
  criticality: {
    blocker: 'criticalityBlocker',
    high: 'criticalityHigh',
    medium: 'criticalityMedium',
    low: 'criticalityLow',
  },
} as const;

export function presentGrowthEnum(
  kind: GrowthEnumPresentationKind,
  value: string | null | undefined,
  messages: GrowthEnumPresentationMessages,
): string {
  if (!value) {
    return messages.unknown;
  }

  const normalized =
    value.trim().toLowerCase();

  const kindMap =
    enumPresentationKeyMap[kind] as Record<
      string,
      keyof GrowthEnumPresentationMessages
    >;

  const messageKey =
    kindMap[normalized];

  if (!messageKey) {
    return messages.unknown;
  }

  return messages[messageKey];
}
