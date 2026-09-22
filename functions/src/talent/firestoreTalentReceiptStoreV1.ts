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
