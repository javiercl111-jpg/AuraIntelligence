import type { Firestore } from "firebase-admin/firestore";

import { getServerFirestoreV1 } from "../firebaseAdmin.js";
import {
  TALENT_RECEIPT_COLLECTION_V1,
  TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1,
  TALENT_RECEIPT_LEASE_MS_V1,
  TALENT_RECEIPT_RETENTION_MS_V1,
  TalentReceiptInvariantErrorV1,
  buildTalentReceiptIdentityV1,
  createTalentReservedReceiptV1,
  createTalentReservationIdV1,
  type TalentReceiptContextV1,
  type TalentReceiptFinalizeInputV1,
  type TalentReceiptFinalizedV1,
  type TalentReceiptRecordV1,
  type TalentReceiptReserveDecisionV1,
  type TalentReceiptStateV1,
  type TalentReceiptStoreV1,
} from "./talentReceiptIdempotencyV1.js";
import type { TalentBridgeEnvironmentV1 } from "./talentBridgeConstantsV1.js";
import { exactTalentAIRecordV1, snapshotTalentAIJsonV1 } from "./talentAIRuntimeContractsV1.js";
import { validateTalentContextScopeV1 } from "./auraTalentContextCompilerV1.js";
import { snapshotTalentAdvisoryRequestV1, validateTalentAdvisoryBodyV1 } from "./talentAdvisoryResponseV1.js";
import {
  classifyTalentAdvisoryReceiptV1,
  createTalentAdvisoryReservedReceiptV1,
  parseTalentAdvisoryReceiptV1,
  snapshotTalentAdvisoryBindingV1,
  validateTalentAdvisoryReceiptV1,
  type TalentAdvisoryFinalizedAcknowledgmentV1,
  type TalentAdvisoryFinalizeInputV1,
  type TalentAdvisoryReceiptRecordV1,
  type TalentAdvisoryReceiptStoreV1,
  type TalentAdvisoryReserveDecisionV1,
  type TalentAdvisoryReserveInputV1,
} from "./talentAdvisoryReceiptV1.js";

export interface FirestoreReceiptDocumentReferenceV1 {
  readonly id: string;
}

export interface FirestoreReceiptDocumentSnapshotV1 {
  readonly exists: boolean;
  data(): unknown;
}

export interface FirestoreReceiptCollectionV1 {
  doc(
    id: string,
  ): FirestoreReceiptDocumentReferenceV1;
}

export interface FirestoreReceiptTransactionV1 {
  get(
    reference: FirestoreReceiptDocumentReferenceV1,
  ): Promise<FirestoreReceiptDocumentSnapshotV1>;

  create(
    reference: FirestoreReceiptDocumentReferenceV1,
    data: unknown,
  ): void;

  update(
    reference: FirestoreReceiptDocumentReferenceV1,
    data: unknown,
  ): void;
}

export interface FirestoreReceiptClientV1 {
  collection(
    path: string,
  ): FirestoreReceiptCollectionV1;

  runTransaction<Result>(
    operation: (
      transaction: FirestoreReceiptTransactionV1,
    ) => Promise<Result>,
  ): Promise<Result>;
}

function asReceiptClientV1(
  firestore: Firestore,
): FirestoreReceiptClientV1 {
  return firestore as unknown as FirestoreReceiptClientV1;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function invariant(
  message: string,
): never {
  throw new TalentReceiptInvariantErrorV1(message);
}

function requireString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value =
    record[field];

  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    return invariant(
      `Receipt field ${field} is invalid.`,
    );
  }

  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  field: string,
): number {
  const value =
    record[field];

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value)
  ) {
    return invariant(
      `Receipt field ${field} is invalid.`,
    );
  }

  return value;
}

function requireDate(
  record: Record<string, unknown>,
  field: string,
): Date {
  const value =
    record[field];

  if (
    value instanceof Date &&
    Number.isFinite(value.getTime())
  ) {
    return new Date(value.getTime());
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value
  ) {
    const candidate =
      value as {
        readonly toDate?: unknown;
      };

    if (
      typeof candidate.toDate === "function"
    ) {
      const date =
        (
          candidate.toDate as () => Date
        )();

      if (
        date instanceof Date &&
        Number.isFinite(date.getTime())
      ) {
        return new Date(date.getTime());
      }
    }
  }

  return invariant(
    `Receipt field ${field} is invalid.`,
  );
}

function requireEnvironment(
  record: Record<string, unknown>,
): TalentBridgeEnvironmentV1 {
  const value =
    requireString(
      record,
      "environment",
    );

  if (
    value !== "preview" &&
    value !== "staging"
  ) {
    return invariant(
      "Receipt environment is invalid.",
    );
  }

  return value;
}

function requireState(
  record: Record<string, unknown>,
): TalentReceiptStateV1 {
  const value =
    requireString(
      record,
      "state",
    );

  if (
    value !== "RESERVED" &&
    value !== "FINALIZED" &&
    value !== "OUTCOME_UNKNOWN"
  ) {
    return invariant(
      "Receipt state is invalid.",
    );
  }

  return value;
}

function assertNoUnexpectedFields(
  record: Record<string, unknown>,
): void {
  const allowed =
    new Set([
      "protocol",
      "environment",
      "authenticatedConsumerId",
      "hcmCompanyId",
      "auraTenantId",
      "requestId",
      "correlationId",
      "requestFingerprint",
      "fingerprintAlgorithm",
      "state",
      "reservationId",
      "createdAt",
      "updatedAt",
      "leaseExpiresAt",
      "expiresAt",
      "terminalHttpStatus",
      "terminalOutcomeCode",
    ]);

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      invariant(
        `Unexpected receipt field: ${key}.`,
      );
    }
  }
}

function parseReceiptV1(
  value: unknown,
): TalentReceiptRecordV1 {
  if (!isRecord(value)) {
    return invariant(
      "Receipt document must be an object.",
    );
  }

  assertNoUnexpectedFields(value);

  const protocol =
    requireString(
      value,
      "protocol",
    );

  if (
    protocol !==
    "HCM_AURA_TALENT_BRIDGE_V1"
  ) {
    return invariant(
      "Receipt protocol is invalid.",
    );
  }

  const environment =
    requireEnvironment(value);

  const authenticatedConsumerId =
    requireString(
      value,
      "authenticatedConsumerId",
    );

  const hcmCompanyId =
    requireString(
      value,
      "hcmCompanyId",
    );

  const auraTenantId =
    requireString(
      value,
      "auraTenantId",
    );

  const requestId =
    requireString(
      value,
      "requestId",
    );

  const correlationId =
    requireString(
      value,
      "correlationId",
    );

  const requestFingerprint =
    requireString(
      value,
      "requestFingerprint",
    );

  if (
    !/^[0-9a-f]{64}$/u.test(
      requestFingerprint,
    )
  ) {
    return invariant(
      "Receipt fingerprint is invalid.",
    );
  }

  const fingerprintAlgorithm =
    requireString(
      value,
      "fingerprintAlgorithm",
    );

  if (
    fingerprintAlgorithm !==
    TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1
  ) {
    return invariant(
      "Receipt fingerprint algorithm is invalid.",
    );
  }

  const state =
    requireState(value);

  const reservationId =
    requireString(
      value,
      "reservationId",
    );

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      .test(reservationId)
  ) {
    return invariant(
      "Receipt reservationId is invalid.",
    );
  }

  const createdAt =
    requireDate(
      value,
      "createdAt",
    );

  const updatedAt =
    requireDate(
      value,
      "updatedAt",
    );

  const leaseExpiresAt =
    requireDate(
      value,
      "leaseExpiresAt",
    );

  const expiresAt =
    requireDate(
      value,
      "expiresAt",
    );

  if (
    leaseExpiresAt.getTime() !==
    createdAt.getTime() +
      TALENT_RECEIPT_LEASE_MS_V1
  ) {
    return invariant(
      "Receipt lease duration is invalid.",
    );
  }

  if (
    expiresAt.getTime() !==
    createdAt.getTime() +
      TALENT_RECEIPT_RETENTION_MS_V1
  ) {
    return invariant(
      "Receipt retention duration is invalid.",
    );
  }

  if (
    state === "FINALIZED"
  ) {
    const terminalHttpStatus =
      requireInteger(
        value,
        "terminalHttpStatus",
      );

    const terminalOutcomeCode =
      requireString(
        value,
        "terminalOutcomeCode",
      );

    requireF1DTerminalOutcomeV1(
      terminalHttpStatus,
      terminalOutcomeCode,
    );

    return Object.freeze({
      protocol,
      environment,
      authenticatedConsumerId,
      hcmCompanyId,
      auraTenantId,
      requestId,
      correlationId,
      requestFingerprint,
      fingerprintAlgorithm:
        TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1,
      state,
      reservationId,
      createdAt,
      updatedAt,
      leaseExpiresAt,
      expiresAt,
      terminalHttpStatus,
      terminalOutcomeCode,
    });
  }

  if (
    "terminalHttpStatus" in value ||
    "terminalOutcomeCode" in value
  ) {
    return invariant(
      "Non-finalized receipt contains terminal fields.",
    );
  }

  return Object.freeze({
    protocol,
    environment,
    authenticatedConsumerId,
    hcmCompanyId,
    auraTenantId,
    requestId,
    correlationId,
    requestFingerprint,
    fingerprintAlgorithm:
      TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1,
    state,
    reservationId,
    createdAt,
    updatedAt,
    leaseExpiresAt,
    expiresAt,
  });
}

function bindingMatchesV1(
  receipt: TalentReceiptRecordV1,
  context: TalentReceiptContextV1,
): boolean {
  return (
    receipt.protocol ===
      context.canonicalRequest.protocol &&
    receipt.environment ===
      context.environment &&
    receipt.authenticatedConsumerId ===
      context.authenticatedConsumerId &&
    receipt.hcmCompanyId ===
      context.canonicalRequest.hcmCompanyId &&
    receipt.auraTenantId ===
      context.auraTenantId &&
    receipt.requestId ===
      context.canonicalRequest.requestId
  );
}

function cloneDate(
  value: Date,
): Date {
  return new Date(
    value.getTime(),
  );
}

function requireF1DTerminalOutcomeV1(
  terminalHttpStatus: number,
  terminalOutcomeCode: string,
): void {
  if (
    terminalHttpStatus !== 503 ||
    terminalOutcomeCode !== "INTERNAL_FAILURE"
  ) {
    invariant(
      "F1D terminal outcome is invalid.",
    );
  }
}

export class FirestoreTalentReceiptStoreV1
implements TalentReceiptStoreV1 {
  private readonly firestore:
    FirestoreReceiptClientV1;

  constructor(
    firestore:
      FirestoreReceiptClientV1 =
        asReceiptClientV1(
          getServerFirestoreV1(),
        ),
    private readonly nowProvider:
      () => Date =
        () => new Date(),
    private readonly reservationIdFactory:
      () => string =
        createTalentReservationIdV1,
  ) {
    this.firestore =
      firestore;
  }

  async reserve(
    context: TalentReceiptContextV1,
  ): Promise<TalentReceiptReserveDecisionV1> {
    const identity =
      buildTalentReceiptIdentityV1(
        context,
      );

    const reference =
      this.firestore
        .collection(
          TALENT_RECEIPT_COLLECTION_V1,
        )
        .doc(
          identity.documentId,
        );

    const reservationId =
      this.reservationIdFactory();

    return this.firestore.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            reference,
          );

        const now =
          cloneDate(
            this.nowProvider(),
          );

        if (!snapshot.exists) {
          const receipt =
            createTalentReservedReceiptV1(
              context,
              now,
              reservationId,
            );

          transaction.create(
            reference,
            receipt,
          );

          return Object.freeze({
            kind:
              "RESERVED_OWNER" as const,
            documentId:
              identity.documentId,
            reservationId,
            requestFingerprint:
              identity.requestFingerprint,
          });
        }

        const receipt =
          parseReceiptV1(
            snapshot.data(),
          );

        if (
          !bindingMatchesV1(
            receipt,
            context,
          )
        ) {
          return Object.freeze({
            kind:
              "IDEMPOTENCY_CONFLICT" as const,
            documentId:
              identity.documentId,
          });
        }

        if (
          receipt.requestFingerprint !==
          identity.requestFingerprint
        ) {
          return Object.freeze({
            kind:
              "IDEMPOTENCY_CONFLICT" as const,
            documentId:
              identity.documentId,
          });
        }

        if (
          receipt.correlationId !==
          context.canonicalRequest.correlationId
        ) {
          return invariant(
            "Receipt correlationId is inconsistent with its fingerprint.",
          );
        }

        if (
          receipt.state ===
          "FINALIZED"
        ) {
          return Object.freeze({
            kind:
              "REPLAY_FINALIZED" as const,
            documentId:
              identity.documentId,
            requestId:
              receipt.requestId,
            correlationId:
              receipt.correlationId,
            terminalHttpStatus:
              receipt.terminalHttpStatus as number,
            terminalOutcomeCode:
              receipt.terminalOutcomeCode as string,
          });
        }

        if (
          receipt.state ===
          "OUTCOME_UNKNOWN"
        ) {
          return Object.freeze({
            kind:
              "OUTCOME_UNKNOWN" as const,
            documentId:
              identity.documentId,
          });
        }

        if (
          receipt.leaseExpiresAt.getTime() >
          now.getTime()
        ) {
          return Object.freeze({
            kind:
              "IDEMPOTENCY_IN_PROGRESS" as const,
            documentId:
              identity.documentId,
          });
        }

        transaction.update(
          reference,
          Object.freeze({
            state:
              "OUTCOME_UNKNOWN",
            updatedAt:
              cloneDate(now),
          }),
        );

        return Object.freeze({
          kind:
            "OUTCOME_UNKNOWN" as const,
          documentId:
            identity.documentId,
        });
      },
    );
  }

  async finalize(
    input: TalentReceiptFinalizeInputV1,
  ): Promise<TalentReceiptFinalizedV1> {
    requireF1DTerminalOutcomeV1(
      input.terminalHttpStatus,
      input.terminalOutcomeCode,
    );

    const identity =
      buildTalentReceiptIdentityV1(
        input.context,
      );

    const reference =
      this.firestore
        .collection(
          TALENT_RECEIPT_COLLECTION_V1,
        )
        .doc(
          identity.documentId,
        );

    const now =
      cloneDate(
        this.nowProvider(),
      );

    return this.firestore.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            reference,
          );

        if (!snapshot.exists) {
          return invariant(
            "Receipt missing during finalize.",
          );
        }

        const receipt =
          parseReceiptV1(
            snapshot.data(),
          );

        if (
          !bindingMatchesV1(
            receipt,
            input.context,
          )
        ) {
          return invariant(
            "Receipt binding changed during finalize.",
          );
        }

        if (
          receipt.requestFingerprint !==
          identity.requestFingerprint
        ) {
          return invariant(
            "Receipt fingerprint changed during finalize.",
          );
        }

        if (
          receipt.correlationId !==
          input.context.canonicalRequest.correlationId
        ) {
          return invariant(
            "Receipt correlationId changed during finalize.",
          );
        }

        if (
          receipt.state !==
          "RESERVED"
        ) {
          return invariant(
            "Receipt is not reserved during finalize.",
          );
        }

        if (
          receipt.reservationId !==
          input.reservationId
        ) {
          return invariant(
            "Receipt reservation owner mismatch.",
          );
        }

        transaction.update(
          reference,
          Object.freeze({
            state:
              "FINALIZED",
            updatedAt:
              cloneDate(now),
            terminalHttpStatus:
              input.terminalHttpStatus,
            terminalOutcomeCode:
              input.terminalOutcomeCode,
          }),
        );

        return Object.freeze({
          documentId:
            identity.documentId,
          requestId:
            receipt.requestId,
          correlationId:
            receipt.correlationId,
          terminalHttpStatus:
            input.terminalHttpStatus,
          terminalOutcomeCode:
            input.terminalOutcomeCode,
        });
      },
    );
  }
}

function snapshotAdvisoryStoreInputV1(value: unknown): TalentAdvisoryReserveInputV1 {
  const input = exactTalentAIRecordV1(snapshotTalentAIJsonV1(value, 294_912, "SCHEMA_VIOLATION"), [
    "context", "executionBinding",
  ]);
  const context = exactTalentAIRecordV1(input.context, [
    "environment", "authenticatedConsumerId", "auraTenantId", "canonicalRequest",
  ]);
  const canonicalRequest = snapshotTalentAdvisoryRequestV1(context.canonicalRequest);
  const scope = validateTalentContextScopeV1({
    environment: context.environment,
    authenticatedConsumerId: context.authenticatedConsumerId,
    auraTenantId: context.auraTenantId,
    hcmCompanyId: canonicalRequest.hcmCompanyId,
  });
  return Object.freeze({
    context: Object.freeze({
      environment: scope.environment,
      authenticatedConsumerId: scope.authenticatedConsumerId,
      auraTenantId: scope.auraTenantId,
      canonicalRequest,
    }),
    executionBinding: snapshotTalentAdvisoryBindingV1(input.executionBinding),
  });
}

/** Decode storage timestamps without changing the certified legacy parser. */
function decodeAdvisoryReceiptDocumentV1(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    return invariant("Invalid advisory receipt document.");
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length > 21) return invariant("Invalid advisory receipt fields.");
  const record: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    if (typeof key !== "string") return invariant("Invalid advisory receipt field.");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return invariant("Invalid advisory receipt property.");
    }
    record[key] = descriptor.value;
  }
  for (const key of ["createdAt", "updatedAt", "leaseExpiresAt", "expiresAt"]) {
    const timestamp = record[key];
    if (timestamp instanceof Date) {
      record[key] = Date.prototype.getTime.call(timestamp);
    } else if (typeof timestamp === "object" && timestamp !== null && "toDate" in timestamp &&
        typeof timestamp.toDate === "function") {
      const date: unknown = timestamp.toDate();
      if (!(date instanceof Date)) return invariant("Invalid advisory receipt timestamp.");
      record[key] = Date.prototype.getTime.call(date);
    }
    if (typeof record[key] !== "number" || !Number.isSafeInteger(record[key]) || (record[key] as number) < 0) {
      return invariant("Invalid advisory receipt time.");
    }
  }
  return record;
}

function encodeAdvisoryReceiptDocumentV1(receipt: TalentAdvisoryReceiptRecordV1): Readonly<Record<string, unknown>> {
  return Object.freeze({
    ...receipt,
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    leaseExpiresAt: new Date(receipt.leaseExpiresAt),
    expiresAt: new Date(receipt.expiresAt),
  });
}

/** Explicit injection only. This class never constructs a client or activates a runtime. */
export class FirestoreTalentAdvisoryReceiptStoreV1 implements TalentAdvisoryReceiptStoreV1 {
  constructor(
    private readonly firestore: FirestoreReceiptClientV1,
    private readonly nowProvider: () => Date = () => new Date(),
    private readonly reservationIdFactory: () => string = createTalentReservationIdV1,
  ) {}

  private nowMillis(): number {
    const date = this.nowProvider();
    if (!(date instanceof Date)) return invariant("Invalid advisory receipt clock.");
    const now = Date.prototype.getTime.call(date);
    if (!Number.isSafeInteger(now) || now < 0) return invariant("Invalid advisory receipt clock.");
    return now;
  }

  async reserve(input: TalentAdvisoryReserveInputV1): Promise<TalentAdvisoryReserveDecisionV1> {
    const snapshotInput = snapshotAdvisoryStoreInputV1(input);
    const { context, executionBinding } = snapshotInput;
    const identity = buildTalentReceiptIdentityV1(context);
    const reference = this.firestore.collection(TALENT_RECEIPT_COLLECTION_V1).doc(identity.documentId);
    if (reference.id !== identity.documentId) return invariant("Advisory receipt reference mismatch.");
    const reservationId = this.reservationIdFactory();

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const now = this.nowMillis();
      if (!snapshot.exists) {
        const receipt = createTalentAdvisoryReservedReceiptV1(context, executionBinding, now, reservationId);
        transaction.create(reference, encodeAdvisoryReceiptDocumentV1(receipt));
        return Object.freeze({ kind: "RESERVED_OWNER", documentId: identity.documentId, receipt });
      }
      const document = decodeAdvisoryReceiptDocumentV1(snapshot.data());
      const decision = classifyTalentAdvisoryReceiptV1(document, context, executionBinding, now);
      if (decision.kind === "OUTCOME_UNKNOWN") {
        const receipt = parseTalentAdvisoryReceiptV1(document);
        if (receipt.state === "RESERVED" && receipt.leaseExpiresAt <= now) {
          transaction.update(reference, Object.freeze({ state: "OUTCOME_UNKNOWN", updatedAt: new Date(now) }));
        }
      }
      return decision;
    });
  }

  async finalize(input: TalentAdvisoryFinalizeInputV1): Promise<TalentAdvisoryFinalizedAcknowledgmentV1> {
    const raw = exactTalentAIRecordV1(snapshotTalentAIJsonV1(input, 327_680, "SCHEMA_VIOLATION"), [
      "context", "executionBinding", "reservationId", "terminalHttpStatus", "terminalOutcomeCode", "terminalBody",
    ]);
    const { context, executionBinding } = snapshotAdvisoryStoreInputV1({
      context: raw.context, executionBinding: raw.executionBinding,
    });
    if (raw.terminalHttpStatus !== 200 || raw.terminalOutcomeCode !== "ADVISORY_DELIVERED" ||
        typeof raw.reservationId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(raw.reservationId)) {
      return invariant("Invalid advisory finalization input.");
    }
    const reservationId = raw.reservationId;
    const terminalBody = validateTalentAdvisoryBodyV1(raw.terminalBody, context.canonicalRequest);
    const identity = buildTalentReceiptIdentityV1(context);
    const reference = this.firestore.collection(TALENT_RECEIPT_COLLECTION_V1).doc(identity.documentId);
    if (reference.id !== identity.documentId) return invariant("Advisory receipt reference mismatch.");

    // The transaction promise acknowledges only committed state, not a callback's tentative result.
    const acknowledgment = await this.firestore.runTransaction<TalentAdvisoryFinalizedAcknowledgmentV1 | null>(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return invariant("Advisory receipt missing during finalization.");
      const now = this.nowMillis();
      const receipt = validateTalentAdvisoryReceiptV1(
        decodeAdvisoryReceiptDocumentV1(snapshot.data()), context, executionBinding, reference.id, now,
      );
      if (receipt.state !== "RESERVED" || receipt.reservationId !== reservationId) {
        return invariant("Advisory reservation ownership or state mismatch.");
      }
      if (receipt.leaseExpiresAt <= now) {
        transaction.update(reference, Object.freeze({ state: "OUTCOME_UNKNOWN", updatedAt: new Date(now) }));
        return null;
      }
      const finalized = validateTalentAdvisoryReceiptV1(Object.freeze({
        ...receipt, state: "FINALIZED", updatedAt: now,
        terminalHttpStatus: 200, terminalOutcomeCode: "ADVISORY_DELIVERED", terminalBody,
      }), context, executionBinding, reference.id, now);
      if (finalized.state !== "FINALIZED") return invariant("Invalid advisory finalization state.");
      transaction.update(reference, Object.freeze({
        state: "FINALIZED", updatedAt: new Date(now),
        terminalHttpStatus: 200, terminalOutcomeCode: "ADVISORY_DELIVERED", terminalBody,
      }));
      return Object.freeze({ documentId: reference.id, receipt: finalized });
    });
    // Throwing inside the callback would abort the expired-state update.
    if (acknowledgment === null) return invariant("Advisory reservation lease expired.");
    return acknowledgment;
  }
}
