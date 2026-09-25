import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";
import { buildTalentReceiptIdentityV1, createTalentReservedReceiptV1, type TalentReceiptContextV1 } from "./talentReceiptIdempotencyV1.js";
import {
  createTalentAdvisoryReservedReceiptV1, classifyTalentAdvisoryReceiptV1,
  type TalentAdvisoryExecutionBindingV1, type TalentAdvisoryReceiptRecordV1, type TalentAdvisoryReceiptStoreV1,
  type TalentAdvisoryReserveDecisionV1, type TalentAdvisoryFinalizedAcknowledgmentV1, type TalentAdvisoryFinalizedReceiptV1,
} from "./talentAdvisoryReceiptV1.js";
import { GovernedTalentAdvisoryDeliveryV1 } from "./talentAdvisoryDeliveryV1.js";

const reservationId = "4f359f13-d149-41ae-a42f-f0f69769fc10";
function fixture(mode: "complete" | "blocked" | "limited" = "complete") {
  const canonicalRequest = validateTalentRequestSchemaV1({
    protocol: "HCM_AURA_TALENT_BRIDGE_V1",
    requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
    hcmCompanyId: "synthetic-company", evaluationMode: "EVALUATION",
    advisoryOnly: true, humanDecisionRequired: true, employmentActionAllowed: false, scoreBlendingAllowed: false,
    jobProfile: {
      jobProfileRef: "JOB_PROFILE_1", requiredSkillRefs: [], requiredCertificationRefs: [],
      promotionThreshold: { performanceScoreMin: 80, potentialScoreMin: 75, promotionReadinessMin: 80, maxDisciplinaryIncidents: 1 },
    },
    subjects: [{
      subjectRef: "INTERNAL_1", subjectType: "INTERNAL",
      performance: { evidenceRef: "PERFORMANCE_1", performanceScore: 84, potentialScore: 80, promotionReadiness: 82,
        attendanceScore: 92, documentationScore: 80, disciplineScore: 100, tenureScore: 78, careerScore: 82,
        riskLevel: "LOW", matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL" },
      hardStops: { evidenceRef: "HARD_STOP_1", passed: mode === "complete",
        readinessOverride: mode === "complete" ? null : mode === "blocked" ? "NOT_READY" : "REVIEW_REQUIRED",
        riskFlags: mode === "complete" ? [] : mode === "blocked" ? ["CRITICAL_SKILL_MISSING"] : ["LOW_CONFIDENCE"],
        confidenceImpact: mode === "limited" ? 20 : 0 },
      evidenceQuality: mode === "limited" ? "CONFIDENCE_INSUFFICIENT" : "EVIDENCE_COMPLETE",
    }],
  });
  const context: TalentReceiptContextV1 = Object.freeze({
    environment: "preview", authenticatedConsumerId: "aura-hcm-talent-bridge-v1",
    auraTenantId: "synthetic-tenant", canonicalRequest,
  });
  const binding: TalentAdvisoryExecutionBindingV1 = Object.freeze({
    deliveryContractVersion: "HCM_AURA_TALENT_ADVISORY_V1",
    runtimeContractVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    policyRevision: "synthetic-policy-v1", executionProfileRevision: "synthetic-fake-v1",
  });
  const findings = mode === "complete" ? [] : [
    { code: "HARD_STOP_PRESENT", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_HARD_STOPS"] },
    ...(mode === "limited" ? [{ code: "EVIDENCE_LIMITATION", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_EVIDENCE_QUALITY"] }] : []),
  ];
  const runtimeResult = {
    kind: "ADVISORY_VALIDATED", schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    advisoryOnly: true, humanDecisionRequired: true, employmentActionAllowed: false, scoreBlendingAllowed: false,
    advisory: { schemaVersion: "TALENT_AI_CANDIDATE_V1", subjectRef: "INTERNAL_1", findings },
  };
  return { context, binding, runtimeResult };
}
function deeplyFrozen(value: unknown): void {
  if (typeof value === "object" && value !== null) {
    assert.equal(Object.isFrozen(value), true);
    Object.values(value).forEach(deeplyFrozen);
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
function harness() {
  const data = fixture("limited");
  let record: TalentAdvisoryReceiptRecordV1 | undefined;
  let now = 1_000;
  let transactionActive = false;
  let evaluations = 0;
  let factories = 0;
  let finalizations = 0;
  let reservations = 0;
  let loseAcknowledgment = false;
  let rejectFinalize = false;
  let runtimeResult: unknown = data.runtimeResult;
  let evaluatorError = false;
  let reservationOverride: unknown;
  let acknowledgmentTransform: ((value: TalentAdvisoryFinalizedAcknowledgmentV1) => unknown) | undefined;
  let holdCommit: Promise<void> | undefined;
  const events: string[] = [];
  const store: TalentAdvisoryReceiptStoreV1 = {
    reserve: async ({ context, executionBinding }) => {
      transactionActive = true;
      try {
        reservations += 1; events.push("reserve");
        const documentId = buildTalentReceiptIdentityV1(context).documentId;
        if (reservationOverride !== undefined) return reservationOverride as TalentAdvisoryReserveDecisionV1;
        if (record) return classifyTalentAdvisoryReceiptV1(record, context, executionBinding, now);
        record = createTalentAdvisoryReservedReceiptV1(context, executionBinding, now, reservationId);
        return Object.freeze({ kind: "RESERVED_OWNER", documentId, receipt: record });
      } finally { transactionActive = false; }
    },
    finalize: async (value) => {
      transactionActive = true;
      try {
        finalizations += 1; events.push("finalize");
        if (rejectFinalize) throw new Error("private-persistence-failure");
        if (holdCommit) await holdCommit;
        assert.ok(record);
        assert.equal(record.state, "RESERVED");
        assert.equal(record.reservationId, value.reservationId);
        assert.ok(now < record.leaseExpiresAt);
        const committed: TalentAdvisoryFinalizedReceiptV1 = Object.freeze({ ...record, state: "FINALIZED", updatedAt: now,
          terminalHttpStatus: value.terminalHttpStatus, terminalOutcomeCode: value.terminalOutcomeCode,
          terminalBody: value.terminalBody });
        record = committed;
        events.push("commit");
        if (loseAcknowledgment) throw new Error("private-lost-acknowledgment");
        const ack = { documentId: buildTalentReceiptIdentityV1(value.context).documentId, receipt: committed };
        return (acknowledgmentTransform ? acknowledgmentTransform(ack) : ack) as TalentAdvisoryFinalizedAcknowledgmentV1;
      } finally { transactionActive = false; }
    },
  };
  const delivery = new GovernedTalentAdvisoryDeliveryV1({
    store, now: () => now,
    profile: {
      executionBinding: data.binding,
      createEvaluator: (context, binding) => {
        assert.equal(transactionActive, false); factories += 1; events.push("factory");
        assert.deepEqual(binding, data.binding); deeplyFrozen(binding); deeplyFrozen(context);
        return { evaluate: async () => {
          assert.equal(transactionActive, false); evaluations += 1; events.push("evaluate");
          if (evaluatorError) throw new Error("private-evaluator-failure");
          return runtimeResult;
        } };
      },
    },
  });
  return {
    ...data, delivery, events, store,
    counts: () => ({ evaluations, factories, finalizations, reservations }),
    record: () => record,
    setNow: (value: number) => { now = value; },
    failPersistence: () => { rejectFinalize = true; },
    loseAck: () => { loseAcknowledgment = true; },
    result: (value: unknown) => { runtimeResult = value; },
    throwEvaluator: () => { evaluatorError = true; },
    reserveAs: (value: unknown) => { reservationOverride = value; },
    transformAck: (fn: (value: TalentAdvisoryFinalizedAcknowledgmentV1) => unknown) => { acknowledgmentTransform = fn; },
    hold: (promise: Promise<void>) => { holdCommit = promise; },
  };
}

test("owner evaluates once outside transactions and delivers only after matching finalization", async () => {
  const state = harness();
  const result = await state.delivery.deliver(state.context);
  assert.equal(result.kind, "DELIVERED"); deeplyFrozen(result);
  assert.deepEqual(state.events, ["reserve", "factory", "evaluate", "finalize", "commit"]);
  assert.deepEqual(state.counts(), { evaluations: 1, factories: 1, finalizations: 1, reservations: 1 });
  if (result.kind !== "DELIVERED") assert.fail("Expected delivery");
  const stored = state.record();
  assert.ok(stored && stored.state === "FINALIZED");
  assert.equal(result.terminalBody, stored.terminalBody);
});

test("retained replay is byte-identical and neither constructs nor invokes evaluator again", async () => {
  const state = harness();
  const first = await state.delivery.deliver(state.context);
  state.throwEvaluator();
  const replay = await state.delivery.deliver(state.context);
  assert.deepEqual(replay, first);
  assert.deepEqual(state.counts(), { evaluations: 1, factories: 1, finalizations: 1, reservations: 2 });
});

test("DELIVERED is withheld while finalization is awaiting commit", async () => {
  const state = harness(); const commit = deferred<void>();
  state.hold(commit.promise);
  let settled = false;
  const running = state.delivery.deliver(state.context).then((result) => { settled = true; return result; });
  // Bounded microtask turns, never wall-clock waiting.
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
  assert.equal(state.events.includes("finalize"), true);
  assert.equal(state.events.includes("commit"), false); assert.equal(settled, false);
  commit.resolve();
  assert.equal((await running).kind, "DELIVERED");
});

test("conflict, live reservation, unknown outcome and version/binding mismatch never evaluate", async () => {
  for (const kind of ["IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_IN_PROGRESS", "OUTCOME_UNKNOWN", "VERSION_MISMATCH", "BINDING_MISMATCH"] as const) {
    const state = harness();
    state.reserveAs({ kind, documentId: buildTalentReceiptIdentityV1(state.context).documentId });
    assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED",
      code: kind === "VERSION_MISMATCH" || kind === "BINDING_MISMATCH" ? "INTERNAL_FAILURE" : kind });
    assert.equal(state.counts().evaluations, 0); assert.equal(state.counts().factories, 0);
    assert.equal(state.counts().finalizations, 0);
  }
});

test("malformed decisions, mismatched owners and replay corruption fail before evaluation", async () => {
  for (const mutate of [
    (decision: Record<string, unknown>) => ({ ...decision, documentId: "wrong" }),
    (decision: Record<string, unknown>) => ({ ...decision, kind: "UNEXPECTED" }),
    (decision: Record<string, unknown>) => ({ ...decision, extra: true }),
    (decision: Record<string, unknown>) => ({ ...decision, receipt: undefined }),
    (decision: Record<string, unknown>) => ({ ...decision, receipt: { ...(decision.receipt as object), auraTenantId: "other" } }),
    (decision: Record<string, unknown>) => ({ ...decision, receipt: { ...(decision.receipt as object), advisoryReceiptVersion: "v2" } }),
    (decision: Record<string, unknown>) => ({ ...decision, receipt: { ...(decision.receipt as object), executionBinding: { ...fixture().binding, policyRevision: "different" } } }),
  ]) {
    const state = harness();
    const receipt = createTalentAdvisoryReservedReceiptV1(state.context, state.binding, 1_000, reservationId);
    state.reserveAs(mutate({ kind: "RESERVED_OWNER", documentId: buildTalentReceiptIdentityV1(state.context).documentId, receipt }));
    assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
    assert.equal(state.counts().evaluations, 0);
  }
  const state = harness();
  await state.delivery.deliver(state.context);
  const stored = state.record();
  assert.ok(stored && stored.state === "FINALIZED");
  state.reserveAs({ kind: "REPLAY_FINALIZED", documentId: buildTalentReceiptIdentityV1(state.context).documentId,
    receipt: { ...stored, terminalBody: stored.terminalBody + " " } });
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.equal(state.counts().evaluations, 1);
});

test("missing/malformed advisory, unexpected runtime outcome and evaluator exception never finalize", async () => {
  for (const result of [null, undefined, {}, { kind: "EXECUTED" }, { kind: "FAILED", code: "PRIVATE" },
    { ...fixture().runtimeResult, advisory: undefined }, { ...fixture().runtimeResult, advisoryOnly: false },
    { ...fixture().runtimeResult, advisory: { ...fixture().runtimeResult.advisory, findings: [{ code: "PROMOTE" }] } }]) {
    const state = harness(); state.result(result);
    assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
    assert.equal(state.counts().evaluations, 1); assert.equal(state.counts().finalizations, 0);
  }
  const state = harness(); state.throwEvaluator();
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.equal(state.counts().evaluations, 1); assert.equal(state.counts().finalizations, 0);
});

test("persistence failure releases no advisory and performs no second attempt", async () => {
  const state = harness(); state.failPersistence();
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.deepEqual(state.counts(), { evaluations: 1, factories: 1, finalizations: 1, reservations: 1 });
  assert.equal(state.events.includes("commit"), false);
  assert.equal(state.record()?.state, "RESERVED");
});

test("commit with lost acknowledgment fails current call and later replay recovers exactly", async () => {
  const state = harness(); state.loseAck();
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  const stored = state.record(); assert.ok(stored && stored.state === "FINALIZED");
  state.throwEvaluator();
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "DELIVERED", terminalBody: stored.terminalBody });
  assert.equal(state.counts().evaluations, 1); assert.equal(state.counts().finalizations, 1);
});

test("acknowledgment validates exact envelope, identity, reservation, binding and committed body", async () => {
  const transforms: Array<(ack: TalentAdvisoryFinalizedAcknowledgmentV1) => unknown> = [
    () => undefined, (ack) => ({ ...ack, extra: true }), (ack) => ({ ...ack, documentId: "other" }),
    (ack) => ({ ...ack, receipt: { ...ack.receipt, reservationId: fixture().context.canonicalRequest.requestId } }),
    (ack) => ({ ...ack, receipt: { ...ack.receipt, terminalBody: ack.receipt.terminalBody + " " } }),
    (ack) => ({ ...ack, receipt: { ...ack.receipt, executionBinding: { ...ack.receipt.executionBinding, executionProfileRevision: "other" } } }),
    (ack) => ({ ...ack, receipt: { ...ack.receipt, requestFingerprint: "f".repeat(64) } }),
    (ack) => ({ ...ack, receipt: { ...ack.receipt, terminalHttpStatus: 503 } }),
  ];
  for (const transform of transforms) {
    const state = harness(); state.transformAck(transform);
    assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
    assert.equal(state.counts().evaluations, 1); assert.equal(state.counts().finalizations, 1);
  }
});

test("expired retained reservation grants no ownership and retained replay stops at retention expiry", async () => {
  const state = harness();
  const receipt = createTalentAdvisoryReservedReceiptV1(state.context, state.binding, 1_000, reservationId);
  state.reserveAs({ kind: "RESERVED_OWNER", documentId: buildTalentReceiptIdentityV1(state.context).documentId, receipt });
  state.setNow(receipt.leaseExpiresAt);
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "OUTCOME_UNKNOWN" });
  assert.equal(state.counts().evaluations, 0);
  const finalized = harness(); await finalized.delivery.deliver(finalized.context);
  const stored = finalized.record(); assert.ok(stored);
  finalized.setNow(stored.expiresAt);
  assert.deepEqual(await finalized.delivery.deliver(finalized.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.equal(finalized.counts().evaluations, 1);
});

test("capability extras cannot cause legacy execution or alternate execution", async () => {
  const state = harness(); let forbidden = 0;
  const profile = {
    executionBinding: state.binding,
    createEvaluator: () => ({ evaluate: async () => { throw new Error("private"); }, execute: () => { forbidden += 1; } }),
    fallback: () => { forbidden += 1; },
  };
  const delivery = new GovernedTalentAdvisoryDeliveryV1({
    store: state.store, profile, now: () => 1_000,
  });
  assert.deepEqual(await delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.equal(forbidden, 0);
});

test("legacy finalized failure is preserved without adopting or evaluating it", async () => {
  const state = harness();
  const legacy = createTalentReservedReceiptV1(state.context, new Date(1_000), reservationId);
  state.reserveAs(classifyTalentAdvisoryReceiptV1({ ...legacy, state: "FINALIZED",
    terminalHttpStatus: 503, terminalOutcomeCode: "INTERNAL_FAILURE" }, state.context, state.binding, 1_000));
  assert.deepEqual(await state.delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.equal(state.counts().evaluations, 0); assert.equal(state.counts().finalizations, 0);
});

test("reserve exception stops before evaluator creation without exposing details", async () => {
  const state = harness(); let calls = 0;
  const delivery = new GovernedTalentAdvisoryDeliveryV1({
    store: { ...state.store, reserve: async () => { throw new Error("private-reservation-detail"); } },
    profile: { executionBinding: state.binding, createEvaluator: () => {
      calls += 1; return { evaluate: async () => state.runtimeResult };
    } }, now: () => 1_000,
  });
  assert.deepEqual(await delivery.deliver(state.context), { kind: "FAILED", code: "INTERNAL_FAILURE" });
  assert.equal(calls, 0);
});

