import { exactTalentAIRecordV1, snapshotTalentAIJsonV1 } from "./talentAIRuntimeContractsV1.js";
import { validateTalentContextScopeV1 } from "./auraTalentContextCompilerV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import { buildTalentReceiptIdentityV1, type TalentReceiptContextV1 } from "./talentReceiptIdempotencyV1.js";
import {
  classifyTalentAdvisoryReceiptV1, snapshotTalentAdvisoryBindingV1, validateTalentAdvisoryReceiptV1,
  type TalentAdvisoryExecutionBindingV1, type TalentAdvisoryReceiptStoreV1,
} from "./talentAdvisoryReceiptV1.js";
import {
  projectTalentAdvisoryResponseV1, serializeTalentAdvisoryResponseV1, snapshotTalentAdvisoryRequestV1,
} from "./talentAdvisoryResponseV1.js";

export type TalentAdvisoryDeliveryFailureV1 =
  "IDEMPOTENCY_CONFLICT" | "IDEMPOTENCY_IN_PROGRESS" | "OUTCOME_UNKNOWN" | "INTERNAL_FAILURE";
export type TalentAdvisoryDeliveryResultV1 =
  | Readonly<{ kind: "DELIVERED"; terminalBody: string }>
  | Readonly<{ kind: "FAILED"; code: TalentAdvisoryDeliveryFailureV1 }>;
export interface TalentAdvisoryDeliveryBoundaryV1 {
  deliver(context: TalentReceiptContextV1): Promise<TalentAdvisoryDeliveryResultV1>;
}
export interface TalentAdvisoryEvaluatorV1 {
  evaluate(input: TalentExecutionInputV1): Promise<unknown>;
}
/** One trusted deployment profile owns both the approved binding and evaluator construction.
 * The profile must configure the evaluator to that binding, including its scoped policy.
 * Neither request data nor persisted records may select or relabel this profile.
 */
export interface TalentAdvisoryExecutionProfileV1 {
  readonly executionBinding: TalentAdvisoryExecutionBindingV1;
  createEvaluator(input: TalentExecutionInputV1, binding: TalentAdvisoryExecutionBindingV1): TalentAdvisoryEvaluatorV1;
}
export interface TalentAdvisoryDeliveryDependenciesV1 {
  readonly store: TalentAdvisoryReceiptStoreV1;
  readonly profile: TalentAdvisoryExecutionProfileV1;
  readonly now?: () => number;
}

function failure(code: TalentAdvisoryDeliveryFailureV1 = "INTERNAL_FAILURE"): TalentAdvisoryDeliveryResultV1 {
  return Object.freeze({ kind: "FAILED", code });
}
function delivered(terminalBody: string): TalentAdvisoryDeliveryResultV1 {
  return Object.freeze({ kind: "DELIVERED", terminalBody });
}
function snapshotContext(value: TalentReceiptContextV1): TalentReceiptContextV1 {
  const record = exactTalentAIRecordV1(snapshotTalentAIJsonV1(value, 278_528, "SCHEMA_VIOLATION"), [
    "environment", "authenticatedConsumerId", "auraTenantId", "canonicalRequest",
  ]);
  const canonicalRequest = snapshotTalentAdvisoryRequestV1(record.canonicalRequest);
  const scope = validateTalentContextScopeV1({ environment: record.environment,
    authenticatedConsumerId: record.authenticatedConsumerId, auraTenantId: record.auraTenantId,
    hcmCompanyId: canonicalRequest.hcmCompanyId });
  return Object.freeze({ environment: scope.environment, authenticatedConsumerId: scope.authenticatedConsumerId,
    auraTenantId: scope.auraTenantId, canonicalRequest });
}
function envelope(value: unknown): Record<string, unknown> {
  const snapshot = snapshotTalentAIJsonV1(value, 65_536, "SCHEMA_VIOLATION");
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) throw new Error("Invalid store response.");
  return snapshot as Record<string, unknown>;
}

export class GovernedTalentAdvisoryDeliveryV1 implements TalentAdvisoryDeliveryBoundaryV1 {
  private readonly binding: TalentAdvisoryExecutionBindingV1;
  private readonly reserve: TalentAdvisoryReceiptStoreV1["reserve"];
  private readonly finalize: TalentAdvisoryReceiptStoreV1["finalize"];
  private readonly createEvaluator: TalentAdvisoryExecutionProfileV1["createEvaluator"];
  private readonly now: () => number;

  constructor(dependencies: TalentAdvisoryDeliveryDependenciesV1) {
    this.binding = snapshotTalentAdvisoryBindingV1(dependencies.profile.executionBinding);
    this.reserve = dependencies.store.reserve.bind(dependencies.store);
    this.finalize = dependencies.store.finalize.bind(dependencies.store);
    this.createEvaluator = dependencies.profile.createEvaluator.bind(dependencies.profile);
    this.now = dependencies.now ?? Date.now;
  }

  private readNow(): number {
    const now = this.now();
    if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid delivery clock.");
    return now;
  }

  async deliver(input: TalentReceiptContextV1): Promise<TalentAdvisoryDeliveryResultV1> {
    try {
      const context = snapshotContext(input);
      const identity = buildTalentReceiptIdentityV1(context);
      const reserveInput = Object.freeze({ context, executionBinding: this.binding });
      const decision = envelope(await this.reserve(reserveInput));
      if (decision.documentId !== identity.documentId) return failure();
      if (decision.kind === "IDEMPOTENCY_CONFLICT" || decision.kind === "IDEMPOTENCY_IN_PROGRESS" || decision.kind === "OUTCOME_UNKNOWN") {
        exactTalentAIRecordV1(decision, ["kind", "documentId"]);
        return failure(decision.kind);
      }
      if (decision.kind === "VERSION_MISMATCH" || decision.kind === "BINDING_MISMATCH") {
        exactTalentAIRecordV1(decision, ["kind", "documentId"]);
        return failure();
      }
      if (decision.kind === "LEGACY_FINALIZED_FAILURE") {
        exactTalentAIRecordV1(decision, ["kind", "documentId", "receipt"]);
        const classified = classifyTalentAdvisoryReceiptV1(decision.receipt, context, this.binding, this.readNow());
        if (classified.kind !== "LEGACY_FINALIZED_FAILURE") return failure();
        return failure();
      }
      if (decision.kind !== "REPLAY_FINALIZED" && decision.kind !== "RESERVED_OWNER") return failure();
      exactTalentAIRecordV1(decision, ["kind", "documentId", "receipt"]);
      const receipt = validateTalentAdvisoryReceiptV1(decision.receipt, context, this.binding, decision.documentId, this.readNow());
      if (decision.kind === "REPLAY_FINALIZED") {
        return receipt.state === "FINALIZED" ? delivered(receipt.terminalBody) : failure();
      }
      if (receipt.state !== "RESERVED") return failure();
      if (this.readNow() >= receipt.leaseExpiresAt) return failure("OUTCOME_UNKNOWN");

      // Reservation has completed before evaluator construction; no transaction callback exists here.
      const evaluator = this.createEvaluator(context, this.binding);
      const result: unknown = await evaluator.evaluate(context);
      const response = projectTalentAdvisoryResponseV1(result, context.canonicalRequest);
      const terminalBody = serializeTalentAdvisoryResponseV1(response, context.canonicalRequest);
      if (this.readNow() >= receipt.leaseExpiresAt) return failure("OUTCOME_UNKNOWN");
      const acknowledgment = envelope(await this.finalize(Object.freeze({
        ...reserveInput, reservationId: receipt.reservationId,
        terminalHttpStatus: 200, terminalOutcomeCode: "ADVISORY_DELIVERED", terminalBody,
      })));
      exactTalentAIRecordV1(acknowledgment, ["documentId", "receipt"]);
      const committed = validateTalentAdvisoryReceiptV1(
        acknowledgment.receipt, context, this.binding, acknowledgment.documentId, this.readNow(),
      );
      if (committed.state !== "FINALIZED" || committed.reservationId !== receipt.reservationId ||
          committed.createdAt !== receipt.createdAt || committed.leaseExpiresAt !== receipt.leaseExpiresAt ||
          committed.expiresAt !== receipt.expiresAt || committed.updatedAt < receipt.updatedAt ||
          committed.terminalBody !== terminalBody) return failure();
      return delivered(committed.terminalBody);
    } catch {
      // No runtime result, exception detail, or uncommitted advisory escapes this boundary.
      return failure();
    }
  }
}
