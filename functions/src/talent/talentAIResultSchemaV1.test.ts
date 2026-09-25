import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  snapshotTalentAIJsonV1, TALENT_AI_FAILURE_CODES_V1, TALENT_AI_MAX_OUTPUT_BYTES_V1,
  TALENT_CONTEXT_RULES_V1, type TalentAIFindingV1, type TalentCompiledContextV1,
} from "./talentAIRuntimeContractsV1.js";
import { failedTalentAIResultV1, validatedTalentAIResultV1, validateTalentAIResultV1 } from "./talentAIResultSchemaV1.js";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";

// Synthetic canonical fixture; no production policy or employee evidence.
function request(mode: "complete" | "blocked" | "limited" = "complete") {
  return validateTalentRequestSchemaV1({
    protocol: "HCM_AURA_TALENT_BRIDGE_V1",
    requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
    hcmCompanyId: "fixture-company", evaluationMode: "EVALUATION",
    advisoryOnly: true, humanDecisionRequired: true,
    employmentActionAllowed: false, scoreBlendingAllowed: false,
    jobProfile: {
      jobProfileRef: "JOB_PROFILE_1", requiredSkillRefs: [], requiredCertificationRefs: [],
      promotionThreshold: { performanceScoreMin: 80, potentialScoreMin: 75, promotionReadinessMin: 80, maxDisciplinaryIncidents: 1 },
    },
    subjects: [{
      subjectRef: "INTERNAL_1", subjectType: "INTERNAL",
      performance: {
        evidenceRef: "PERFORMANCE_1", performanceScore: 84, potentialScore: 80,
        promotionReadiness: 82, attendanceScore: 92, documentationScore: 80,
        disciplineScore: 100, tenureScore: 78, careerScore: 82,
        riskLevel: "LOW", matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL",
      },
      hardStops: {
        evidenceRef: "HARD_STOP_1", passed: mode === "complete",
        readinessOverride: mode === "complete" ? null : mode === "blocked" ? "NOT_READY" : "REVIEW_REQUIRED",
        riskFlags: mode === "complete" ? [] : mode === "blocked" ? ["CRITICAL_SKILL_MISSING"] : ["LOW_CONFIDENCE"],
        confidenceImpact: mode === "limited" ? 20 : 0,
      },
      evidenceQuality: mode === "limited" ? "CONFIDENCE_INSUFFICIENT" : "EVIDENCE_COMPLETE",
    }],
  });
}

const context: TalentCompiledContextV1 = {
  scope: { environment: "preview", authenticatedConsumerId: "aura-hcm-talent-bridge-v1", hcmCompanyId: "fixture-company", auraTenantId: "fixture-tenant" },
  policyRevision: "synthetic-v1", rules: TALENT_CONTEXT_RULES_V1,
};
const hardStop: TalentAIFindingV1 = {
  code: "HARD_STOP_PRESENT", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_HARD_STOPS"],
};
const limitation: TalentAIFindingV1 = {
  code: "EVIDENCE_LIMITATION", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_EVIDENCE_QUALITY"],
};
function candidate(findings: readonly unknown[] = []) {
  return { schemaVersion: "TALENT_AI_CANDIDATE_V1", subjectRef: "INTERNAL_1", findings };
}
function rejects(raw: unknown, mode: "complete" | "blocked" | "limited" = "complete", code = "SCHEMA_VIOLATION") {
  assert.throws(() => validateTalentAIResultV1(raw, request(mode), context),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === code);
}
function assertFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertFrozen);
}

test("candidate findings match canonical conditions exactly and become deeply immutable", () => {
  for (const [mode, findings] of [
    ["complete", []], ["blocked", [hardStop]], ["limited", [hardStop, limitation]],
  ] as const) {
    const advisory = validateTalentAIResultV1(candidate(findings), request(mode), context);
    assert.deepEqual(advisory.findings, findings);
    const result = validatedTalentAIResultV1(advisory);
    assertFrozen(result);
    assert.equal(result.advisoryOnly, true);
    assert.equal(result.humanDecisionRequired, true);
    assert.equal(result.employmentActionAllowed, false);
    assert.equal(result.scoreBlendingAllowed, false);
  }
});

test("missing, contradictory, duplicated and reordered findings are rejected", () => {
  rejects(candidate([hardStop]));
  rejects(candidate(), "blocked");
  rejects(candidate([hardStop]), "limited");
  rejects(candidate([limitation, hardStop]), "limited");
  rejects(candidate([hardStop, hardStop]), "limited");
  rejects(candidate([hardStop, limitation, hardStop]), "limited");
});

test("exact keys, literals and reference tuples reject all result expansion", () => {
  for (const key of ["scores", "rankings", "readinessOverride", "employmentDecision", "actions", "advisoryOnly", "humanDecisionRequired", "employmentActionAllowed", "scoreBlendingAllowed"]) {
    rejects({ ...candidate(), [key]: false });
  }
  rejects({ ...candidate(), schemaVersion: "v2" });
  rejects({ ...candidate(), subjectRef: "INTERNAL_2" });
  rejects({ ...candidate(), findings: {} });
  for (const finding of [
    { ...hardStop, code: "PROMOTE" }, { ...hardStop, evidenceRefs: ["PERFORMANCE_1"] },
    { ...hardStop, evidenceRefs: [] }, { ...hardStop, evidenceRefs: ["HARD_STOP_1", "HARD_STOP_1"] },
    { ...hardStop, contextRefs: ["CONTEXT_UNKNOWN"] }, { ...hardStop, scores: 99 },
  ]) rejects(candidate([finding]), "blocked");
  rejects({ ...candidate(), narrative: "forbidden" }, "complete", "PROHIBITED_PII");
  rejects({ ...candidate(), fullName: "synthetic forbidden value" }, "complete", "PROHIBITED_PII");
  rejects({ ...candidate(), tool_calls: [] }, "complete", "TOOL_FAILURE");
});

test("malformed, non-JSON, oversized and accessor-bearing outputs fail without evaluation", () => {
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  const sparse = new Array(2);
  for (const value of [null, undefined, "{}", 1, [], new Date(0), cyclic, { findings: sparse },
    { ...candidate(), findings: [Number.NaN] }, { ...candidate(), payload: "x".repeat(16_384) }]) {
    rejects(value, "complete", "MALFORMED_PROVIDER_OUTPUT");
  }
  let reads = 0;
  const accessor = { ...candidate(), get hidden() { reads += 1; return "x"; } };
  rejects(accessor, "complete", "MALFORMED_PROVIDER_OUTPUT");
  assert.equal(reads, 0);
  const symbolic = { ...candidate(), [Symbol("hidden")]: true };
  rejects(symbolic, "complete", "MALFORMED_PROVIDER_OUTPUT");
});

test("16 KiB ceiling counts serialized UTF-8, including punctuation and escapes", () => {
  const exact = "a".repeat(TALENT_AI_MAX_OUTPUT_BYTES_V1 - 2);
  assert.equal(snapshotTalentAIJsonV1(exact, 16_384, "MALFORMED_PROVIDER_OUTPUT"), exact);
  assert.throws(() => snapshotTalentAIJsonV1(exact + "a", 16_384, "MALFORMED_PROVIDER_OUTPUT"));
  assert.throws(() => snapshotTalentAIJsonV1("é".repeat(8_192), 16_384, "MALFORMED_PROVIDER_OUTPUT"));
  assert.throws(() => snapshotTalentAIJsonV1("\n".repeat(8_192), 16_384, "MALFORMED_PROVIDER_OUTPUT"));
});

test("findings cannot cite absent context", () => {
  assert.throws(() => validateTalentAIResultV1(candidate([hardStop]), request("blocked"),
    { ...context, rules: [TALENT_CONTEXT_RULES_V1[0]] }), { code: "MISSING_GOVERNED_CONTEXT" });
});

test("every failure is immutable, has all guarantees, and has no advisory or raw data", () => {
  for (const code of TALENT_AI_FAILURE_CODES_V1) {
    const result = failedTalentAIResultV1(code);
    assert.deepEqual(Object.keys(result).sort(), ["kind", "schemaVersion", "advisoryOnly", "humanDecisionRequired", "employmentActionAllowed", "scoreBlendingAllowed", "code"].sort());
    assert.equal(result.kind, "FAILED");
    assert.equal(result.advisoryOnly, true);
    assert.equal(result.humanDecisionRequired, true);
    assert.equal(result.employmentActionAllowed, false);
    assert.equal(result.scoreBlendingAllowed, false);
    assertFrozen(result);
  }
});
