import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  FirestoreTalentReceiptStoreV1,
  type FirestoreReceiptClientV1,
  type FirestoreReceiptCollectionV1,
  type FirestoreReceiptDocumentReferenceV1,
  type FirestoreReceiptDocumentSnapshotV1,
  type FirestoreReceiptTransactionV1,
} from "./firestoreTalentReceiptStoreV1.js";
import {
  TALENT_RECEIPT_COLLECTION_V1,
  TALENT_RECEIPT_LEASE_MS_V1,
  TALENT_RECEIPT_RETENTION_MS_V1,
  TalentReceiptInvariantErrorV1,
  buildTalentReceiptIdentityV1,
  serializeTalentCanonicalRequestV1,
  type TalentReceiptContextV1,
} from "./talentReceiptIdempotencyV1.js";
import type { TalentCanonicalRequestV1 } from "./talentRequestSchemaV1.js";

const RESERVATION_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function canonicalRequest(
  correlationId =
    "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
): TalentCanonicalRequestV1 {
  return {
    protocol:
      "HCM_AURA_TALENT_BRIDGE_V1",
    requestId:
      "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId,
    hcmCompanyId:
      "company_123",
    evaluationMode:
      "EVALUATION",
    advisoryOnly:
      true,
    humanDecisionRequired:
      true,
    employmentActionAllowed:
      false,
    scoreBlendingAllowed:
      false,
    jobProfile: {
      jobProfileRef:
        "JOB_PROFILE_1",
      requiredSkillRefs: [
        "SKILL_1",
      ],
      requiredCertificationRefs: [
        "CERTIFICATION_1",
      ],
      promotionThreshold: {
        performanceScoreMin:
          80,
        potentialScoreMin:
          75,
        promotionReadinessMin:
          80,
        maxDisciplinaryIncidents:
          1,
      },
    },
    subjects: [
      {
        subjectRef:
          "INTERNAL_1",
        subjectType:
          "INTERNAL",
        performance: {
          evidenceRef:
            "PERFORMANCE_1",
          performanceScore:
            84,
          potentialScore:
            80,
          promotionReadiness:
            82,
          attendanceScore:
            92,
          documentationScore:
            80,
          disciplineScore:
            100,
          tenureScore:
            78,
          careerScore:
            82,
          riskLevel:
            "LOW",
          matrixCell:
            "HIGH_PERFORMANCE_MEDIUM_POTENTIAL",
        },
        hardStops: {
          evidenceRef:
            "HARD_STOP_1",
          passed:
            true,
          readinessOverride:
            null,
          riskFlags: [],
          confidenceImpact:
            0,
        },
        evidenceQuality:
          "EVIDENCE_COMPLETE",
      },
    ],
  };
}

function context(
  request =
    canonicalRequest(),
  auraTenantId =
    "aura-preview-hcm-demo-enterprise",
): TalentReceiptContextV1 {
  return {
    environment:
      "preview",
    authenticatedConsumerId:
      "aura-hcm-talent-bridge-v1",
    auraTenantId,
    canonicalRequest:
      request,
  };
}

class FakeReference
implements FirestoreReceiptDocumentReferenceV1 {
  constructor(
    readonly id: string,
  ) {}
}

class FakeSnapshot
implements FirestoreReceiptDocumentSnapshotV1 {
  constructor(
    private readonly value:
      Record<string, unknown> | undefined,
  ) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): unknown {
    if (this.value === undefined) {
      return undefined;
    }

    return structuredClone(
      this.value,
    );
  }
}

class FakeCollection
implements FirestoreReceiptCollectionV1 {
  constructor(
    private readonly owner:
      FakeReceiptFirestore,
  ) {}

  doc(
    id: string,
  ): FirestoreReceiptDocumentReferenceV1 {
    return new FakeReference(id);
  }
}

class FakeTransaction
implements FirestoreReceiptTransactionV1 {
  constructor(
    private readonly owner:
      FakeReceiptFirestore,
  ) {}

  async get(
    reference:
      FirestoreReceiptDocumentReferenceV1,
  ): Promise<FirestoreReceiptDocumentSnapshotV1> {
    return new FakeSnapshot(
      this.owner.read(
        reference.id,
      ),
    );
  }

  create(
    reference:
      FirestoreReceiptDocumentReferenceV1,
    data: unknown,
  ): void {
    if (
      this.owner.read(
        reference.id,
      ) !== undefined
    ) {
      throw new Error(
        "document-already-exists",
      );
    }

    this.owner.write(
      reference.id,
      data,
    );
  }

  update(
    reference:
      FirestoreReceiptDocumentReferenceV1,
    data: unknown,
  ): void {
    const current =
      this.owner.read(
        reference.id,
      );

    if (current === undefined) {
      throw new Error(
        "document-missing",
      );
    }

    assert.equal(
      typeof data,
      "object",
    );

    assert.notEqual(
      data,
      null,
    );

    this.owner.write(
      reference.id,
      {
        ...current,
        ...(
          data as
            Record<string, unknown>
        ),
      },
    );
  }
}

class FakeReceiptFirestore
implements FirestoreReceiptClientV1 {
  readonly records =
    new Map<
      string,
      Record<string, unknown>
    >();

  transactionCount =
    0;

  collection(
    path: string,
  ): FirestoreReceiptCollectionV1 {
    assert.equal(
      path,
      TALENT_RECEIPT_COLLECTION_V1,
    );

    return new FakeCollection(
      this,
    );
  }

  async runTransaction<Result>(
    operation: (
      transaction:
        FirestoreReceiptTransactionV1,
    ) => Promise<Result>,
  ): Promise<Result> {
    this.transactionCount +=
      1;

    return operation(
      new FakeTransaction(this),
    );
  }

  read(
    id: string,
  ): Record<string, unknown> | undefined {
    const value =
      this.records.get(id);

    if (value === undefined) {
      return undefined;
    }

    return structuredClone(
      value,
    );
  }

  write(
    id: string,
    value: unknown,
  ): void {
    assert.equal(
      typeof value,
      "object",
    );

    assert.notEqual(
      value,
      null,
    );

    this.records.set(
      id,
      structuredClone(
        value as
          Record<string, unknown>,
      ),
    );
  }
}

test(
  "document identity excludes correlationId while fingerprint includes it",
  () => {
    const first =
      context(
        canonicalRequest(
          "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
        ),
      );

    const second =
      context(
        canonicalRequest(
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ),
      );

    const firstIdentity =
      buildTalentReceiptIdentityV1(
        first,
      );

    const secondIdentity =
      buildTalentReceiptIdentityV1(
        second,
      );

    assert.equal(
      firstIdentity.documentId,
      secondIdentity.documentId,
    );

    assert.notEqual(
      firstIdentity.requestFingerprint,
      secondIdentity.requestFingerprint,
    );

    assert.match(
      firstIdentity.documentId,
      /^[0-9a-f]{64}$/u,
    );

    assert.match(
      firstIdentity.requestFingerprint,
      /^[0-9a-f]{64}$/u,
    );

    assert.notEqual(
      serializeTalentCanonicalRequestV1(
        first.canonicalRequest,
      ),
      serializeTalentCanonicalRequestV1(
        second.canonicalRequest,
      ),
    );
  },
);

test(
  "absent receipt is transactionally reserved without request payload",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    const now =
      new Date(
        "2026-09-21T20:00:00.000Z",
      );

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () => new Date(now),
        () => RESERVATION_ID,
      );

    const input =
      context();

    const identity =
      buildTalentReceiptIdentityV1(
        input,
      );

    const result =
      await store.reserve(
        input,
      );

    assert.equal(
      result.kind,
      "RESERVED_OWNER",
    );

    assert.equal(
      firestore.transactionCount,
      1,
    );

    const record =
      firestore.read(
        identity.documentId,
      );

    assert.ok(record);

    assert.equal(
      record.state,
      "RESERVED",
    );

    assert.equal(
      record.reservationId,
      RESERVATION_ID,
    );

    assert.equal(
      record.requestId,
      input.canonicalRequest.requestId,
    );

    assert.equal(
      record.correlationId,
      input.canonicalRequest.correlationId,
    );

    assert.equal(
      record.auraTenantId,
      input.auraTenantId,
    );

    assert.equal(
      (
        record.leaseExpiresAt as Date
      ).getTime(),
      now.getTime() +
        TALENT_RECEIPT_LEASE_MS_V1,
    );

    assert.equal(
      (
        record.expiresAt as Date
      ).getTime(),
      now.getTime() +
        TALENT_RECEIPT_RETENTION_MS_V1,
    );

    for (const prohibited of [
      "rawBody",
      "body",
      "bearer",
      "secret",
      "subjects",
      "jobProfile",
      "performance",
      "scores",
      "providerOutput",
    ]) {
      assert.equal(
        prohibited in record,
        false,
      );
    }
  },
);

test(
  "active reservation replays as in-progress and expired reservation fails closed",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    let nowMs =
      Date.parse(
        "2026-09-21T20:00:00.000Z",
      );

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () => new Date(nowMs),
        () => RESERVATION_ID,
      );

    const input =
      context();

    const first =
      await store.reserve(
        input,
      );

    assert.equal(
      first.kind,
      "RESERVED_OWNER",
    );

    const active =
      await store.reserve(
        input,
      );

    assert.equal(
      active.kind,
      "IDEMPOTENCY_IN_PROGRESS",
    );

    nowMs +=
      TALENT_RECEIPT_LEASE_MS_V1 +
      1;

    const expired =
      await store.reserve(
        input,
      );

    assert.equal(
      expired.kind,
      "OUTCOME_UNKNOWN",
    );

    const identity =
      buildTalentReceiptIdentityV1(
        input,
      );

    const record =
      firestore.read(
        identity.documentId,
      );

    assert.equal(
      record?.state,
      "OUTCOME_UNKNOWN",
    );

    const repeated =
      await store.reserve(
        input,
      );

    assert.equal(
      repeated.kind,
      "OUTCOME_UNKNOWN",
    );
  },
);

test(
  "same idempotency key with changed request or tenant binding is conflict",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
        () => RESERVATION_ID,
      );

    const original =
      context();

    const first =
      await store.reserve(
        original,
      );

    assert.equal(
      first.kind,
      "RESERVED_OWNER",
    );

    const changedCorrelation =
      context(
        canonicalRequest(
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ),
      );

    const conflictFingerprint =
      await store.reserve(
        changedCorrelation,
      );

    assert.equal(
      conflictFingerprint.kind,
      "IDEMPOTENCY_CONFLICT",
    );

    const changedTenant =
      context(
        canonicalRequest(),
        "aura-preview-hcm-different",
      );

    const conflictTenant =
      await store.reserve(
        changedTenant,
      );

    assert.equal(
      conflictTenant.kind,
      "IDEMPOTENCY_CONFLICT",
    );
  },
);

test(
  "only reservation owner can finalize and finalized receipt replays terminal outcome",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
        () => RESERVATION_ID,
      );

    const input =
      context();

    const reserved =
      await store.reserve(
        input,
      );

    assert.equal(
      reserved.kind,
      "RESERVED_OWNER",
    );

    await assert.rejects(
      async () => store.finalize({
        context:
          input,
        reservationId:
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        terminalHttpStatus:
          503,
        terminalOutcomeCode:
          "INTERNAL_FAILURE",
      }),
      TalentReceiptInvariantErrorV1,
    );

    const finalized =
      await store.finalize({
        context:
          input,
        reservationId:
          RESERVATION_ID,
        terminalHttpStatus:
          503,
        terminalOutcomeCode:
          "INTERNAL_FAILURE",
      });

    assert.equal(
      finalized.terminalHttpStatus,
      503,
    );

    assert.equal(
      finalized.terminalOutcomeCode,
      "INTERNAL_FAILURE",
    );

    const replay =
      await store.reserve(
        input,
      );

    assert.equal(
      replay.kind,
      "REPLAY_FINALIZED",
    );

    if (
      replay.kind !==
      "REPLAY_FINALIZED"
    ) {
      assert.fail(
        "Expected finalized replay.",
      );
    }

    assert.equal(
      replay.terminalHttpStatus,
      503,
    );

    assert.equal(
      replay.terminalOutcomeCode,
      "INTERNAL_FAILURE",
    );
  },
);

test(
  "corrupt receipt fails closed and is not overwritten",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    const input =
      context();

    const identity =
      buildTalentReceiptIdentityV1(
        input,
      );

    firestore.write(
      identity.documentId,
      {
        protocol:
          "HCM_AURA_TALENT_BRIDGE_V1",
        state:
          "CORRUPT",
      },
    );

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
        () => RESERVATION_ID,
      );

    await assert.rejects(
      async () => store.reserve(
        input,
      ),
      TalentReceiptInvariantErrorV1,
    );

    const record =
      firestore.read(
        identity.documentId,
      );

    assert.equal(
      record?.state,
      "CORRUPT",
    );
  },
);
test(
  "finalize rejects every non-F1D terminal outcome before another transaction",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
        () => RESERVATION_ID,
      );

    const input =
      context();

    const reserved =
      await store.reserve(
        input,
      );

    assert.equal(
      reserved.kind,
      "RESERVED_OWNER",
    );

    assert.equal(
      firestore.transactionCount,
      1,
    );

    await assert.rejects(
      async () => store.finalize({
        context:
          input,
        reservationId:
          RESERVATION_ID,
        terminalHttpStatus:
          200,
        terminalOutcomeCode:
          "INTERNAL_FAILURE",
      }),
      TalentReceiptInvariantErrorV1,
    );

    await assert.rejects(
      async () => store.finalize({
        context:
          input,
        reservationId:
          RESERVATION_ID,
        terminalHttpStatus:
          503,
        terminalOutcomeCode:
          "UNEXPECTED_OUTCOME",
      }),
      TalentReceiptInvariantErrorV1,
    );

    assert.equal(
      firestore.transactionCount,
      1,
    );

    const identity =
      buildTalentReceiptIdentityV1(
        input,
      );

    assert.equal(
      firestore.read(
        identity.documentId,
      )?.state,
      "RESERVED",
    );
  },
);

test(
  "persisted finalized receipt with invalid terminal pair fails closed on replay",
  async () => {
    const firestore =
      new FakeReceiptFirestore();

    const store =
      new FirestoreTalentReceiptStoreV1(
        firestore,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
        () => RESERVATION_ID,
      );

    const input =
      context();

    await store.reserve(
      input,
    );

    await store.finalize({
      context:
        input,
      reservationId:
        RESERVATION_ID,
      terminalHttpStatus:
        503,
      terminalOutcomeCode:
        "INTERNAL_FAILURE",
    });

    const identity =
      buildTalentReceiptIdentityV1(
        input,
      );

    const finalized =
      firestore.read(
        identity.documentId,
      );

    assert.ok(finalized);

    firestore.write(
      identity.documentId,
      {
        ...finalized,
        terminalHttpStatus:
          200,
        terminalOutcomeCode:
          "UNEXPECTED_OUTCOME",
      },
    );

    await assert.rejects(
      async () => store.reserve(
        input,
      ),
      TalentReceiptInvariantErrorV1,
    );

    const corrupt =
      firestore.read(
        identity.documentId,
      );

    assert.equal(
      corrupt?.terminalHttpStatus,
      200,
    );

    assert.equal(
      corrupt?.terminalOutcomeCode,
      "UNEXPECTED_OUTCOME",
    );
  },
);
