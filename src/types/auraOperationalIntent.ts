export type AuraOperationalIntentId =
  | 'COUNT_WORK_ORDERS'
  | 'COUNT_URGENT_WORK_ORDERS'
  | 'COUNT_OVERDUE_WORK_ORDERS'
  | 'COUNT_UNASSIGNED_WORK_ORDERS'
  | 'COUNT_PENDING_SIGNATURES'
  | 'COUNT_SIGNED_TODAY'
  | 'COUNT_SEALED_DOCUMENTS'
  | 'COUNT_ACTIVE_EMPLOYEES'
  | 'COUNT_LOW_STOCK_ITEMS'
  | 'COUNT_OUT_OF_STOCK_ITEMS'
  | 'COUNT_PREVENTIVES_OVERDUE'
  | 'COUNT_ACTIVE_EMERGENCIES'
  | 'UNKNOWN_OPERATIONAL';

export interface AuraOperationalIntentResult {
  intentId: AuraOperationalIntentId;
  confidence: number;
  matchedKeywords: string[];
  source:
    | 'maintenance'
    | 'signature'
    | 'hcm'
    | 'unknown';
}