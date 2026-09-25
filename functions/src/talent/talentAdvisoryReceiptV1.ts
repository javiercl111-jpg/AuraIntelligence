import { exactTalentAIRecordV1, snapshotTalentAIJsonV1 } from "./talentAIRuntimeContractsV1.js";
import { validateTalentContextScopeV1 } from "./auraTalentContextCompilerV1.js";
import {
  buildTalentReceiptIdentityV1, createTalentReservedReceiptV1,
  TALENT_RECEIPT_LEASE_MS_V1, TALENT_RECEIPT_RETENTION_MS_V1,
  type TalentReceiptContextV1, type TalentReceiptRecordV1,
} from "./talentReceiptIdempotencyV1.js";
import { TALENT_ADVISORY_HTTP_SCHEMA_V1, validateTalentAdvisoryBodyV1 } from "./talentAdvisoryResponseV1.js";

export const TALENT_ADVISORY_RECEIPT_VERSION_V1 = "TALENT_ADVISORY_RECEIPT_V1";
export interface TalentAdvisoryExecutionBindingV1 {
  readonly deliveryContractVersion: "HCM_AURA_TALENT_ADVISORY_V1";
  readonly runtimeContractVersion: "TALENT_AI_RUNTIME_RESULT_V1";
  readonly policyRevision: string;
  readonly executionProfileRevision: string;
}

export class TalentAdvisoryReceiptErrorV1 extends Error {
  constructor(readonly reason: "INVALID_RECEIPT" | "VERSION_MISMATCH" | "BINDING_MISMATCH") {
    super(reason);
    this.name = "TalentAdvisoryReceiptErrorV1";
  }
}
function invalid(): never { throw new TalentAdvisoryReceiptErrorV1("INVALID_RECEIPT"); }

export function snapshotTalentAdvisoryBindingV1(value: unknown): TalentAdvisoryExecutionBindingV1 {
  const record = exactTalentAIRecordV1(snapshotTalentAIJsonV1(value, 1_024, "SCHEMA_VIOLATION"), [
    "deliveryContractVersion", "runtimeContractVersion", "policyRevision", "executionProfileRevision",
  ]);
  if (record.deliveryContractVersion !== TALENT_ADVISORY_HTTP_SCHEMA_V1 ||
      record.runtimeContractVersion !== "TALENT_AI_RUNTIME_RESULT_V1") {
    throw new TalentAdvisoryReceiptErrorV1("VERSION_MISMATCH");
  }
  for (const key of ["policyRevision", "executionProfileRevision"]) {
    if (typeof record[key] !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(record[key] as string)) invalid();
  }
  return Object.freeze({
    deliveryContractVersion: TALENT_ADVISORY_HTTP_SCHEMA_V1,
    runtimeContractVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    policyRevision: record.policyRevision as string,
    executionProfileRevision: record.executionProfileRevision as string,
  });
}

/** The approved value is deployment-owned, never derived from a request or receipt. */
export function requireTalentAdvisoryBindingV1(actual: unknown, approved: TalentAdvisoryExecutionBindingV1): TalentAdvisoryExecutionBindingV1 {
  const binding = snapshotTalentAdvisoryBindingV1(actual);
  if (JSON.stringify(binding) !== JSON.stringify(snapshotTalentAdvisoryBindingV1(approved))) {
    throw new TalentAdvisoryReceiptErrorV1("BINDING_MISMATCH");
  }
  return binding;
}

// Epoch milliseconds are immutable boundary values. Storage adapters must explicitly
// decode timestamps; legacy Date values are accepted and defensively normalized here.
type ReceiptBaseV1 = Omit<TalentReceiptRecordV1,
  "state" | "createdAt" | "updatedAt" | "leaseExpiresAt" | "expiresAt" | "terminalHttpStatus" | "terminalOutcomeCode"
> & Readonly<{ createdAt: number; updatedAt: number; leaseExpiresAt: number; expiresAt: number }>;
type AdvisoryVersionV1 = Readonly<{
  advisoryReceiptVersion: "TALENT_ADVISORY_RECEIPT_V1";
  executionBinding: TalentAdvisoryExecutionBindingV1;
}>;
export type TalentAdvisoryReservedReceiptV1 = ReceiptBaseV1 & AdvisoryVersionV1 & Readonly<{ state: "RESERVED" }>;
export type TalentAdvisoryUnknownReceiptV1 = ReceiptBaseV1 & AdvisoryVersionV1 & Readonly<{ state: "OUTCOME_UNKNOWN" }>;
export type TalentAdvisoryFinalizedReceiptV1 = ReceiptBaseV1 & AdvisoryVersionV1 & Readonly<{
  state: "FINALIZED";
  terminalHttpStatus: 200;
  terminalOutcomeCode: "ADVISORY_DELIVERED";
  terminalBody: string;
}>;
export type TalentAdvisoryReceiptRecordV1 = TalentAdvisoryReservedReceiptV1 | TalentAdvisoryUnknownReceiptV1 | TalentAdvisoryFinalizedReceiptV1;
export type TalentLegacyReceiptSnapshotV1 = ReceiptBaseV1 & (
  | Readonly<{ state: "RESERVED" | "OUTCOME_UNKNOWN" }>
  | Readonly<{ state: "FINALIZED"; terminalHttpStatus: 503; terminalOutcomeCode: "INTERNAL_FAILURE" }>
);
export type TalentAdvisoryFinalizedAcknowledgmentV1 = Readonly<{
  documentId: string;
  receipt: TalentAdvisoryFinalizedReceiptV1;
}>;
export type TalentAdvisoryReserveDecisionV1 =
  | Readonly<{ kind: "RESERVED_OWNER"; documentId: string; receipt: TalentAdvisoryReservedReceiptV1 }>
  | Readonly<{ kind: "REPLAY_FINALIZED"; documentId: string; receipt: TalentAdvisoryFinalizedReceiptV1 }>
  | Readonly<{ kind: "LEGACY_FINALIZED_FAILURE"; documentId: string; receipt: TalentLegacyReceiptSnapshotV1 }>
  | Readonly<{ kind: "IDEMPOTENCY_CONFLICT" | "IDEMPOTENCY_IN_PROGRESS" | "OUTCOME_UNKNOWN" | "VERSION_MISMATCH" | "BINDING_MISMATCH"; documentId: string }>;

export interface TalentAdvisoryReserveInputV1 {
  readonly context: TalentReceiptContextV1;
  readonly executionBinding: TalentAdvisoryExecutionBindingV1;
}
export interface TalentAdvisoryFinalizeInputV1 extends TalentAdvisoryReserveInputV1 {
  readonly reservationId: string;
  readonly terminalHttpStatus: 200;
  readonly terminalOutcomeCode: "ADVISORY_DELIVERED";
  readonly terminalBody: string;
}

/** Implementations atomically reserve/classify and finalize the existing identity.
 * Finalize must check owner, binding, fingerprint, RESERVED state and live lease.
 * Acknowledgment is returned only after commit. No execution callback is accepted.
 * An expired RESERVED record must transition atomically to OUTCOME_UNKNOWN.
 */
export interface TalentAdvisoryReceiptStoreV1 {
  reserve(input: TalentAdvisoryReserveInputV1): Promise<TalentAdvisoryReserveDecisionV1>;
  finalize(input: TalentAdvisoryFinalizeInputV1): Promise<TalentAdvisoryFinalizedAcknowledgmentV1>;
}

const baseKeys = ["protocol", "environment", "authenticatedConsumerId", "hcmCompanyId", "auraTenantId",
  "requestId", "correlationId", "requestFingerprint", "fingerprintAlgorithm", "state", "reservationId",
  "createdAt", "updatedAt", "leaseExpiresAt", "expiresAt"] as const;
const dateKeys = ["createdAt", "updatedAt", "leaseExpiresAt", "expiresAt"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function receiptSnapshot(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return invalid();
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return invalid();
  const keys = Reflect.ownKeys(value);
  if (keys.length > 21) return invalid();
  const plain: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    if (typeof key !== "string") return invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return invalid();
    const item: unknown = descriptor.value;
    plain[key] = (dateKeys as readonly string[]).includes(key) && item instanceof Date
      ? Date.prototype.getTime.call(item) : item;
  }
  return snapshotTalentAIJsonV1(plain, 32_768, "SCHEMA_VIOLATION") as Record<string, unknown>;
}

export function parseTalentAdvisoryReceiptV1(value: unknown): TalentAdvisoryReceiptRecordV1 | TalentLegacyReceiptSnapshotV1 {
  const record = receiptSnapshot(value);
  const advisory = Object.prototype.hasOwnProperty.call(record, "advisoryReceiptVersion");
  if (advisory && record.advisoryReceiptVersion !== TALENT_ADVISORY_RECEIPT_VERSION_V1) {
    throw new TalentAdvisoryReceiptErrorV1("VERSION_MISMATCH");
  }
  if (record.state !== "RESERVED" && record.state !== "OUTCOME_UNKNOWN" && record.state !== "FINALIZED") return invalid();
  const terminalKeys = record.state === "FINALIZED"
    ? ["terminalHttpStatus", "terminalOutcomeCode", ...(advisory ? ["terminalBody"] : [])] : [];
  exactTalentAIRecordV1(record, [...baseKeys, ...(advisory ? ["advisoryReceiptVersion", "executionBinding"] : []), ...terminalKeys]);
  if (record.protocol !== "HCM_AURA_TALENT_BRIDGE_V1" || record.fingerprintAlgorithm !== "SHA-256" ||
      typeof record.requestFingerprint !== "string" || !/^[0-9a-f]{64}$/u.test(record.requestFingerprint)) return invalid();
  validateTalentContextScopeV1({ environment: record.environment, authenticatedConsumerId: record.authenticatedConsumerId,
    hcmCompanyId: record.hcmCompanyId, auraTenantId: record.auraTenantId });
  for (const key of ["requestId", "correlationId", "reservationId"]) {
    if (typeof record[key] !== "string" || !uuid.test(record[key] as string)) invalid();
  }
  for (const key of dateKeys) {
    if (typeof record[key] !== "number" || !Number.isSafeInteger(record[key]) || (record[key] as number) < 0) invalid();
  }
  const created = record.createdAt as number;
  if (record.leaseExpiresAt !== created + TALENT_RECEIPT_LEASE_MS_V1 ||
      record.expiresAt !== created + TALENT_RECEIPT_RETENTION_MS_V1 || (record.updatedAt as number) < created) return invalid();
  if (advisory) {
    const binding = snapshotTalentAdvisoryBindingV1(record.executionBinding);
    if (record.state === "FINALIZED" && (record.terminalHttpStatus !== 200 ||
        record.terminalOutcomeCode !== "ADVISORY_DELIVERED" || typeof record.terminalBody !== "string" ||
        (record.updatedAt as number) >= (record.leaseExpiresAt as number))) return invalid();
    return Object.freeze({ ...record, executionBinding: binding }) as unknown as TalentAdvisoryReceiptRecordV1;
  }
  if (record.state === "FINALIZED" && (record.terminalHttpStatus !== 503 || record.terminalOutcomeCode !== "INTERNAL_FAILURE")) return invalid();
  return Object.freeze({ ...record }) as unknown as TalentLegacyReceiptSnapshotV1;
}

export function requireTalentAdvisoryReceiptContextV1(
  receipt: TalentAdvisoryReceiptRecordV1 | TalentLegacyReceiptSnapshotV1,
  context: TalentReceiptContextV1, documentId: unknown, now: number,
): void {
  const identity = buildTalentReceiptIdentityV1(context);
  if (!Number.isSafeInteger(now) || now < receipt.createdAt || now < receipt.updatedAt || now >= receipt.expiresAt ||
      documentId !== identity.documentId || receipt.requestFingerprint !== identity.requestFingerprint ||
      receipt.protocol !== context.canonicalRequest.protocol || receipt.environment !== context.environment ||
      receipt.authenticatedConsumerId !== context.authenticatedConsumerId || receipt.auraTenantId !== context.auraTenantId ||
      receipt.hcmCompanyId !== context.canonicalRequest.hcmCompanyId || receipt.requestId !== context.canonicalRequest.requestId ||
      receipt.correlationId !== context.canonicalRequest.correlationId) invalid();
}

export function validateTalentAdvisoryReceiptV1(
  value: unknown, context: TalentReceiptContextV1, approved: TalentAdvisoryExecutionBindingV1,
  documentId: unknown, now: number,
): TalentAdvisoryReceiptRecordV1 {
  const receipt = parseTalentAdvisoryReceiptV1(value);
  if (!("advisoryReceiptVersion" in receipt)) return invalid();
  requireTalentAdvisoryReceiptContextV1(receipt, context, documentId, now);
  requireTalentAdvisoryBindingV1(receipt.executionBinding, approved);
  if (receipt.state === "FINALIZED") validateTalentAdvisoryBodyV1(receipt.terminalBody, context.canonicalRequest);
  return receipt;
}

export function createTalentAdvisoryReservedReceiptV1(
  context: TalentReceiptContextV1, binding: TalentAdvisoryExecutionBindingV1, now: number, reservationId: string,
): TalentAdvisoryReservedReceiptV1 {
  if (!Number.isSafeInteger(now) || now < 0) return invalid();
  const receipt = parseTalentAdvisoryReceiptV1({
    ...createTalentReservedReceiptV1(context, new Date(now), reservationId),
    advisoryReceiptVersion: TALENT_ADVISORY_RECEIPT_VERSION_V1,
    executionBinding: snapshotTalentAdvisoryBindingV1(binding),
  });
  if (!("advisoryReceiptVersion" in receipt) || receipt.state !== "RESERVED") return invalid();
  return receipt;
}

/** Pure classification only. The future store owns the atomic expired-state update. */
export function classifyTalentAdvisoryReceiptV1(
  value: unknown, context: TalentReceiptContextV1, approved: TalentAdvisoryExecutionBindingV1, now: number,
): TalentAdvisoryReserveDecisionV1 {
  const documentId = buildTalentReceiptIdentityV1(context).documentId;
  let receipt: TalentAdvisoryReceiptRecordV1 | TalentLegacyReceiptSnapshotV1;
  try { receipt = parseTalentAdvisoryReceiptV1(value); } catch (error: unknown) {
    if (error instanceof TalentAdvisoryReceiptErrorV1 && error.reason === "VERSION_MISMATCH") {
      return Object.freeze({ kind: "VERSION_MISMATCH", documentId });
    }
    throw error;
  }
  if (receipt.environment !== context.environment || receipt.authenticatedConsumerId !== context.authenticatedConsumerId ||
      receipt.hcmCompanyId !== context.canonicalRequest.hcmCompanyId || receipt.auraTenantId !== context.auraTenantId ||
      receipt.requestId !== context.canonicalRequest.requestId ||
      receipt.requestFingerprint !== buildTalentReceiptIdentityV1(context).requestFingerprint) {
    return Object.freeze({ kind: "IDEMPOTENCY_CONFLICT", documentId });
  }
  requireTalentAdvisoryReceiptContextV1(receipt, context, documentId, now);
  if ("advisoryReceiptVersion" in receipt) {
    try { requireTalentAdvisoryBindingV1(receipt.executionBinding, approved); } catch (error: unknown) {
      if (error instanceof TalentAdvisoryReceiptErrorV1 && error.reason === "BINDING_MISMATCH") {
        return Object.freeze({ kind: "BINDING_MISMATCH", documentId });
      }
      throw error;
    }
    if (receipt.state === "FINALIZED") {
      validateTalentAdvisoryBodyV1(receipt.terminalBody, context.canonicalRequest);
      return Object.freeze({ kind: "REPLAY_FINALIZED", documentId, receipt });
    }
  } else if (receipt.state === "FINALIZED") {
    return Object.freeze({ kind: "LEGACY_FINALIZED_FAILURE", documentId, receipt });
  }
  return Object.freeze({ kind: receipt.state === "OUTCOME_UNKNOWN" || receipt.leaseExpiresAt <= now
    ? "OUTCOME_UNKNOWN" : "IDEMPOTENCY_IN_PROGRESS", documentId });
}
