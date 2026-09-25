import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";
import type { TalentReceiptContextV1 } from "./talentReceiptIdempotencyV1.js";
import type { TalentAdvisoryExecutionBindingV1 } from "./talentAdvisoryReceiptV1.js";
import {
  projectTalentAdvisoryResponseV1, validateTalentAdvisoryResponseV1,
  serializeTalentAdvisoryResponseV1, validateTalentAdvisoryBodyV1,
} from "./talentAdvisoryResponseV1.js";

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

test("all canonical closed finding combinations project to immutable exact HTTP envelopes", () => {
  for (const mode of ["complete", "blocked", "limited"] as const) {
    const { context, runtimeResult } = fixture(mode);
    const response = projectTalentAdvisoryResponseV1(runtimeResult, context.canonicalRequest);
    assert.deepEqual(response, {
      protocol: "HCM_AURA_TALENT_BRIDGE_V1", schemaVersion: "HCM_AURA_TALENT_ADVISORY_V1",
      requestId: context.canonicalRequest.requestId, correlationId: context.canonicalRequest.correlationId,
      advisoryOnly: true, humanDecisionRequired: true, employmentActionAllowed: false, scoreBlendingAllowed: false,
      advisory: runtimeResult.advisory,
    });
    assert.equal(response.advisory.findings.length, mode === "complete" ? 0 : mode === "blocked" ? 1 : 2);
    deeplyFrozen(response);
    const body = serializeTalentAdvisoryResponseV1(response, context.canonicalRequest);
    assert.equal(validateTalentAdvisoryBodyV1(body, context.canonicalRequest), body);
    assert.doesNotMatch(body, /synthetic-tenant|synthetic-company|synthetic-policy|synthetic-fake/u);
  }
});

test("canonical serialization fixes property order and ignores source insertion order", () => {
  const { context, runtimeResult } = fixture();
  const response = projectTalentAdvisoryResponseV1(runtimeResult, context.canonicalRequest);
  const reordered = Object.fromEntries(Object.entries(response).reverse());
  const body = serializeTalentAdvisoryResponseV1(reordered, context.canonicalRequest);
  const expected = '{"protocol":"HCM_AURA_TALENT_BRIDGE_V1","schemaVersion":"HCM_AURA_TALENT_ADVISORY_V1","requestId":"b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21","correlationId":"9d95c68b-2a91-4cd0-ae64-04c84418d6e2","advisoryOnly":true,"humanDecisionRequired":true,"employmentActionAllowed":false,"scoreBlendingAllowed":false,"advisory":{"schemaVersion":"TALENT_AI_CANDIDATE_V1","subjectRef":"INTERNAL_1","findings":[]}}';
  assert.equal(body, expected);
  for (const noncanonical of [" " + body, body + "\n", JSON.stringify(reordered),
    body.replace('"protocol":', '"protocol":"HCM_AURA_TALENT_BRIDGE_V1","protocol":')]) {
    assert.throws(() => validateTalentAdvisoryBodyV1(noncanonical, context.canonicalRequest));
  }
});

test("response and runtime exact keys reject prohibited fields and altered governance", () => {
  const { context, runtimeResult } = fixture();
  const response = projectTalentAdvisoryResponseV1(runtimeResult, context.canonicalRequest);
  for (const key of ["employmentDecision", "rankings", "scores", "providerMetadata", "reasoning", "actions", "rawProviderContent", "providerFailure", "fullName"]) {
    assert.throws(() => projectTalentAdvisoryResponseV1({ ...runtimeResult, [key]: "forbidden" }, context.canonicalRequest));
    assert.throws(() => validateTalentAdvisoryResponseV1({ ...response, [key]: "forbidden" }, context.canonicalRequest));
    assert.throws(() => validateTalentAdvisoryResponseV1({ ...response, advisory: { ...response.advisory, [key]: "forbidden" } }, context.canonicalRequest));
  }
  for (const [key, value] of [["advisoryOnly", false], ["humanDecisionRequired", false],
    ["employmentActionAllowed", true], ["scoreBlendingAllowed", true]] as const) {
    assert.throws(() => projectTalentAdvisoryResponseV1({ ...runtimeResult, [key]: value }, context.canonicalRequest));
    assert.throws(() => validateTalentAdvisoryResponseV1({ ...response, [key]: value }, context.canonicalRequest));
  }
  for (const key of Object.keys(response)) {
    const missing: Record<string, unknown> = { ...response }; delete missing[key];
    assert.throws(() => validateTalentAdvisoryResponseV1(missing, context.canonicalRequest));
  }
  for (const [key, value] of [["protocol", "v2"], ["schemaVersion", "v2"], ["requestId", reservationId], ["correlationId", reservationId]]) {
    assert.throws(() => validateTalentAdvisoryResponseV1({ ...response, [key]: value }, context.canonicalRequest));
  }
});

test("invalid finding keys, references, ordering and canonical conditions never project", () => {
  const { context, runtimeResult } = fixture("limited");
  const findings = runtimeResult.advisory.findings;
  for (const altered of [[], [findings[0]], [...findings].reverse(), [findings[0], findings[0]],
    [...findings, findings[0]], [{ ...findings[0], evidenceRefs: ["PERFORMANCE_1"] }, findings[1]],
    [{ ...findings[0], contextRefs: ["UNKNOWN"] }, findings[1]],
    [{ ...findings[0], code: "PROMOTE" }, findings[1]],
    [{ ...findings[0], confidence: 100 }, findings[1]]]) {
    assert.throws(() => projectTalentAdvisoryResponseV1({
      ...runtimeResult, advisory: { ...runtimeResult.advisory, findings: altered },
    }, context.canonicalRequest));
  }
  assert.throws(() => projectTalentAdvisoryResponseV1(runtimeResult, fixture().context.canonicalRequest));
});

test("runtime failures, missing advisories and unexpected outcomes cannot become success", () => {
  const { context, runtimeResult } = fixture();
  for (const result of [null, [], undefined, {}, { ...runtimeResult, kind: "EXECUTED" },
    { ...runtimeResult, schemaVersion: "OTHER" }, { ...runtimeResult, advisory: null },
    { kind: "FAILED", code: "PROVIDER_UNAVAILABLE", schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1",
      advisoryOnly: true, humanDecisionRequired: true, employmentActionAllowed: false, scoreBlendingAllowed: false }]) {
    assert.throws(() => projectTalentAdvisoryResponseV1(result, context.canonicalRequest));
  }
});

test("body size is bounded in UTF-8 and malformed or executable data is rejected", () => {
  const { context, runtimeResult } = fixture();
  for (const body of ["x".repeat(16_385), "é".repeat(8_193), "{", "", "null", "[]"]) {
    assert.throws(() => validateTalentAdvisoryBodyV1(body, context.canonicalRequest));
  }
  assert.throws(() => projectTalentAdvisoryResponseV1({ ...runtimeResult, huge: "é".repeat(8_193) }, context.canonicalRequest));
  let reads = 0;
  assert.throws(() => projectTalentAdvisoryResponseV1({ ...runtimeResult, get additional() { reads += 1; return 1; } }, context.canonicalRequest));
  assert.equal(reads, 0);
  assert.throws(() => projectTalentAdvisoryResponseV1({ ...runtimeResult, [Symbol("hidden")]: 1 }, context.canonicalRequest));
});

