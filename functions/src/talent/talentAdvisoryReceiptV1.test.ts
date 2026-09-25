import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";
import {
  buildTalentReceiptIdentityV1, createTalentReservedReceiptV1, TALENT_RECEIPT_LEASE_MS_V1, TALENT_RECEIPT_RETENTION_MS_V1,
  type TalentReceiptContextV1,
} from "./talentReceiptIdempotencyV1.js";
import {
  createTalentAdvisoryReservedReceiptV1, parseTalentAdvisoryReceiptV1, validateTalentAdvisoryReceiptV1,
  classifyTalentAdvisoryReceiptV1, snapshotTalentAdvisoryBindingV1, requireTalentAdvisoryBindingV1,
  type TalentAdvisoryExecutionBindingV1, type TalentAdvisoryFinalizedReceiptV1,
} from "./talentAdvisoryReceiptV1.js";
import { projectTalentAdvisoryResponseV1, serializeTalentAdvisoryResponseV1 } from "./talentAdvisoryResponseV1.js";

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

function receipts() {
  const data = fixture("limited");
  const reserved = createTalentAdvisoryReservedReceiptV1(data.context, data.binding, 1_000, reservationId);
  const terminalBody = serializeTalentAdvisoryResponseV1(
    projectTalentAdvisoryResponseV1(data.runtimeResult, data.context.canonicalRequest), data.context.canonicalRequest,
  );
  const finalized: TalentAdvisoryFinalizedReceiptV1 = Object.freeze({
    ...reserved, state: "FINALIZED", updatedAt: 1_001,
    terminalHttpStatus: 200, terminalOutcomeCode: "ADVISORY_DELIVERED", terminalBody,
  });
  const documentId = buildTalentReceiptIdentityV1(data.context).documentId;
  return { ...data, reserved, finalized, documentId };
}

test("binding is exact, immutable, bounded and compared against independent deployment approval", () => {
  const { binding } = fixture();
  const mutable = { ...binding };
  const snapshot = snapshotTalentAdvisoryBindingV1(mutable);
  mutable.policyRevision = "changed";
  assert.equal(snapshot.policyRevision, binding.policyRevision); deeplyFrozen(snapshot);
  assert.deepEqual(requireTalentAdvisoryBindingV1(snapshot, binding), binding);
  for (const key of ["policyRevision", "executionProfileRevision"]) {
    for (const value of ["", "../policy", "spaces forbidden", "é", "a".repeat(65), 3]) {
      assert.throws(() => snapshotTalentAdvisoryBindingV1({ ...binding, [key]: value }));
    }
    assert.throws(() => requireTalentAdvisoryBindingV1({ ...binding, [key]: "different-v2" }, binding), { reason: "BINDING_MISMATCH" });
  }
  for (const key of ["deliveryContractVersion", "runtimeContractVersion"]) {
    assert.throws(() => snapshotTalentAdvisoryBindingV1({ ...binding, [key]: "v2" }), { reason: "VERSION_MISMATCH" });
  }
  assert.throws(() => snapshotTalentAdvisoryBindingV1({ ...binding, providerName: "forbidden" }));
  assert.throws(() => snapshotTalentAdvisoryBindingV1({ ...binding, credential: "forbidden" }));
});

test("reserved receipt reuses certified identity, fingerprint and timing semantics", () => {
  const { context, binding, reserved, documentId } = receipts();
  const legacy = createTalentReservedReceiptV1(context, new Date(1_000), reservationId);
  assert.equal(reserved.requestFingerprint, legacy.requestFingerprint);
  assert.equal(reserved.reservationId, legacy.reservationId);
  assert.equal(reserved.leaseExpiresAt, 1_000 + TALENT_RECEIPT_LEASE_MS_V1);
  assert.equal(reserved.expiresAt, 1_000 + TALENT_RECEIPT_RETENTION_MS_V1);
  deeplyFrozen(validateTalentAdvisoryReceiptV1(reserved, context, binding, documentId, 1_001));
  const parsed = parseTalentAdvisoryReceiptV1(legacy);
  legacy.createdAt.setTime(9_999);
  assert.equal(parsed.createdAt, 1_000);
  deeplyFrozen(parsed);
});

test("state-specific exact keys prohibit terminal fields on unresolved receipts", () => {
  const { reserved } = receipts();
  for (const state of ["RESERVED", "OUTCOME_UNKNOWN"] as const) {
    const unresolved = { ...reserved, state };
    assert.equal(parseTalentAdvisoryReceiptV1(unresolved).state, state);
    for (const [key, value] of [["terminalHttpStatus", 200], ["terminalOutcomeCode", "ADVISORY_DELIVERED"],
      ["terminalBody", "{}"], ["advisory", {}], ["rawProviderContent", "x"]] as const) {
      assert.throws(() => parseTalentAdvisoryReceiptV1({ ...unresolved, [key]: value }));
    }
  }
  for (const key of Object.keys(reserved)) {
    const missing: Record<string, unknown> = { ...reserved }; delete missing[key];
    assert.throws(() => parseTalentAdvisoryReceiptV1(missing));
  }
  assert.throws(() => parseTalentAdvisoryReceiptV1({ ...reserved, state: "READY" }));
  assert.throws(() => parseTalentAdvisoryReceiptV1({ ...reserved, leaseExpiresAt: reserved.leaseExpiresAt + 1 }));
  assert.throws(() => parseTalentAdvisoryReceiptV1({ ...reserved, expiresAt: reserved.expiresAt + 1 }));
  assert.throws(() => parseTalentAdvisoryReceiptV1({ ...reserved, updatedAt: 999 }));
});

test("finalized success stores only the canonical body and exact 200 terminal fields", () => {
  const { finalized, context, binding, documentId } = receipts();
  const parsed = validateTalentAdvisoryReceiptV1(finalized, context, binding, documentId, 1_001);
  assert.deepEqual(parsed, finalized); deeplyFrozen(parsed);
  assert.equal("advisory" in parsed, false);
  for (const altered of [
    { ...finalized, terminalHttpStatus: 201 }, { ...finalized, terminalOutcomeCode: "SUCCESS" },
    { ...finalized, advisory: {} }, { ...finalized, terminalBody: undefined },
    { ...finalized, updatedAt: finalized.leaseExpiresAt },
  ]) assert.throws(() => validateTalentAdvisoryReceiptV1(altered, context, binding, documentId, 1_001));
  for (const terminalBody of ["{", "{}", "null", " " + finalized.terminalBody, finalized.terminalBody + "\n",
    "x".repeat(16_385), finalized.terminalBody.replace("HARD_STOP_PRESENT", "PROMOTE"),
    finalized.terminalBody.replace('"employmentActionAllowed":false', '"employmentActionAllowed":true')]) {
    assert.throws(() => validateTalentAdvisoryReceiptV1({ ...finalized, terminalBody }, context, binding, documentId, 1_001));
  }
});

test("receipt, tenant, fingerprint, version, binding and retention mismatches fail closed", () => {
  const { finalized, context, binding, documentId } = receipts();
  for (const changed of [
    { ...finalized, auraTenantId: "another-tenant" }, { ...finalized, hcmCompanyId: "another-company" },
    { ...finalized, requestFingerprint: "a".repeat(64) }, { ...finalized, correlationId: reservationId },
    { ...finalized, advisoryReceiptVersion: "v2" },
    { ...finalized, executionBinding: { ...binding, policyRevision: "different" } },
    { ...finalized, executionBinding: { ...binding, executionProfileRevision: "different" } },
  ]) assert.throws(() => validateTalentAdvisoryReceiptV1(changed, context, binding, documentId, 1_001));
  assert.throws(() => validateTalentAdvisoryReceiptV1(finalized, context, binding, "wrong-document", 1_001));
  assert.throws(() => validateTalentAdvisoryReceiptV1(finalized, context, binding, documentId, finalized.expiresAt));
  assert.equal(classifyTalentAdvisoryReceiptV1({ ...finalized, advisoryReceiptVersion: "v2" }, context, binding, 1_001).kind, "VERSION_MISMATCH");
  assert.equal(classifyTalentAdvisoryReceiptV1({ ...finalized, executionBinding: { ...binding, policyRevision: "other" } }, context, binding, 1_001).kind, "BINDING_MISMATCH");
  assert.equal(classifyTalentAdvisoryReceiptV1({ ...finalized, requestFingerprint: "a".repeat(64) }, context, binding, 1_001).kind, "IDEMPOTENCY_CONFLICT");
});

test("legacy finalized failure, live reservation and expired reservation remain blocking outcomes", () => {
  const { context, binding } = fixture();
  const legacy = createTalentReservedReceiptV1(context, new Date(1_000), reservationId);
  assert.equal(classifyTalentAdvisoryReceiptV1(legacy, context, binding, 1_001).kind, "IDEMPOTENCY_IN_PROGRESS");
  assert.equal(classifyTalentAdvisoryReceiptV1(legacy, context, binding, legacy.leaseExpiresAt.getTime()).kind, "OUTCOME_UNKNOWN");
  assert.equal(classifyTalentAdvisoryReceiptV1({ ...legacy, state: "OUTCOME_UNKNOWN" }, context, binding, 1_001).kind, "OUTCOME_UNKNOWN");
  const finalized = { ...legacy, state: "FINALIZED", terminalHttpStatus: 503, terminalOutcomeCode: "INTERNAL_FAILURE" };
  assert.equal(classifyTalentAdvisoryReceiptV1(finalized, context, binding, 1_001).kind, "LEGACY_FINALIZED_FAILURE");
  assert.throws(() => parseTalentAdvisoryReceiptV1({ ...finalized, terminalHttpStatus: 200 }));
  assert.throws(() => parseTalentAdvisoryReceiptV1({ ...finalized, terminalBody: "{}" }));
});

test("advisory replay returns the committed body; expired reservation classification does not grant ownership", () => {
  const { finalized, reserved, context, binding } = receipts();
  const decision = classifyTalentAdvisoryReceiptV1(finalized, context, binding, 1_001);
  assert.equal(decision.kind, "REPLAY_FINALIZED");
  if (decision.kind !== "REPLAY_FINALIZED") assert.fail("Expected replay");
  assert.equal(decision.receipt.terminalBody, finalized.terminalBody);
  assert.equal(classifyTalentAdvisoryReceiptV1(reserved, context, binding, reserved.leaseExpiresAt).kind, "OUTCOME_UNKNOWN");
});

