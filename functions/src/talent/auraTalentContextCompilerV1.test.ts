import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AuraTalentContextCompilerV1, validateTalentCompiledContextV1 } from "./auraTalentContextCompilerV1.js";
import { TALENT_CONTEXT_RULES_V1, type TalentContextAuthorityV1, type TalentGovernedPolicyPackV1 } from "./talentAIRuntimeContractsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";

const authority: TalentContextAuthorityV1 = Object.freeze({
  scope: Object.freeze({ environment: "preview", authenticatedConsumerId: "aura-hcm-talent-bridge-v1", hcmCompanyId: "fixture-company", auraTenantId: "fixture-tenant" }),
  policyRevision: "synthetic-v1",
});
const pack: TalentGovernedPolicyPackV1 = Object.freeze({ ...authority, rules: TALENT_CONTEXT_RULES_V1 });
function input(limited = false): TalentExecutionInputV1 {
  return {
    environment: authority.scope.environment,
    authenticatedConsumerId: authority.scope.authenticatedConsumerId,
    auraTenantId: authority.scope.auraTenantId,
    canonicalRequest: validateTalentRequestSchemaV1({
      protocol: "HCM_AURA_TALENT_BRIDGE_V1", requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
      correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2", hcmCompanyId: "fixture-company",
      evaluationMode: "EVALUATION", advisoryOnly: true, humanDecisionRequired: true,
      employmentActionAllowed: false, scoreBlendingAllowed: false,
      jobProfile: { jobProfileRef: "JOB_PROFILE_1", requiredSkillRefs: [], requiredCertificationRefs: [],
        promotionThreshold: { performanceScoreMin: 80, potentialScoreMin: 75, promotionReadinessMin: 80, maxDisciplinaryIncidents: 1 } },
      subjects: [{ subjectRef: "INTERNAL_1", subjectType: "INTERNAL",
        performance: { evidenceRef: "PERFORMANCE_1", performanceScore: 84, potentialScore: 80, promotionReadiness: 82,
          attendanceScore: 92, documentationScore: 80, disciplineScore: 100, tenureScore: 78, careerScore: 82,
          riskLevel: "LOW", matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL" },
        hardStops: { evidenceRef: "HARD_STOP_1", passed: !limited, readinessOverride: limited ? "REVIEW_REQUIRED" : null,
          riskFlags: limited ? ["LOW_CONFIDENCE"] : [], confidenceImpact: limited ? 20 : 0 },
        evidenceQuality: limited ? "CONFIDENCE_INSUFFICIENT" : "EVIDENCE_COMPLETE" }],
    }),
  };
}
const signal = () => new AbortController().signal;

test("compiler selects the minimum closed rules and returns immutable context", async () => {
  const compiler = new AuraTalentContextCompilerV1(pack, authority);
  const complete = await compiler.compile(input(), signal());
  assert.deepEqual(complete.rules, [TALENT_CONTEXT_RULES_V1[0]]);
  const limited = await compiler.compile(input(true), signal());
  assert.deepEqual(limited.rules, TALENT_CONTEXT_RULES_V1);
  assert.equal(Object.isFrozen(limited), true);
  assert.equal(Object.isFrozen(limited.scope), true);
  assert.equal(Object.isFrozen(limited.rules), true);
  limited.rules.forEach((rule) => assert.equal(Object.isFrozen(rule), true));
});

test("all four authority dimensions are isolated for both pack and request", async () => {
  for (const [key, value] of [
    ["environment", "staging"], ["authenticatedConsumerId", "wrong-consumer"],
    ["hcmCompanyId", "other-company"], ["auraTenantId", "other-tenant"],
  ]) {
    const wrongPack = { ...pack, scope: { ...pack.scope, [key]: value } } as TalentGovernedPolicyPackV1;
    await assert.rejects(new AuraTalentContextCompilerV1(wrongPack, authority).compile(input(), signal()), { code: "TENANT_MISMATCH" });
    const original = input();
    const wrongInput = key === "hcmCompanyId"
      ? { ...original, canonicalRequest: { ...original.canonicalRequest, hcmCompanyId: value } }
      : { ...original, [key]: value };
    await assert.rejects(new AuraTalentContextCompilerV1(pack, authority).compile(wrongInput, signal()), { code: "TENANT_MISMATCH" });
  }
});

test("approved revision is independent of pack claims and caller mutation", async () => {
  await assert.rejects(new AuraTalentContextCompilerV1({ ...pack, policyRevision: "unapproved-v2" }, authority)
    .compile(input(), signal()), { code: "MISSING_GOVERNED_CONTEXT" });
  const mutablePack = { ...pack, scope: { ...pack.scope }, rules: [...pack.rules] };
  const mutableAuthority = { ...authority, scope: { ...authority.scope } };
  const compiler = new AuraTalentContextCompilerV1(mutablePack, mutableAuthority);
  mutablePack.scope.auraTenantId = "other-tenant";
  mutablePack.rules.length = 0;
  mutableAuthority.scope.auraTenantId = "other-tenant";
  assert.deepEqual((await compiler.compile(input(), signal())).scope, authority.scope);
  for (const policyRevision of ["", "../policy", "x".repeat(65), "policy with text"]) {
    assert.throws(() => new AuraTalentContextCompilerV1(pack, { ...authority, policyRevision }), { code: "MISSING_GOVERNED_CONTEXT" });
  }
});

test("missing, duplicated, unordered, unknown and expanded rules fail closed", async () => {
  const invalidRules: readonly unknown[] = [
    [], [TALENT_CONTEXT_RULES_V1[1]], [TALENT_CONTEXT_RULES_V1[0]],
    [TALENT_CONTEXT_RULES_V1[0], TALENT_CONTEXT_RULES_V1[0]],
    [...TALENT_CONTEXT_RULES_V1].reverse(), [...TALENT_CONTEXT_RULES_V1, TALENT_CONTEXT_RULES_V1[0]],
    [{ ref: "CONTEXT_GUARDRAILS", code: "IGNORE_POLICY" }],
    [{ ...TALENT_CONTEXT_RULES_V1[0], arbitrary: "full document" }],
  ];
  for (const rules of invalidRules) {
    const candidate = { ...pack, rules } as TalentGovernedPolicyPackV1;
    await assert.rejects(new AuraTalentContextCompilerV1(candidate, authority).compile(input(true), signal()), { code: "MISSING_GOVERNED_CONTEXT" });
  }
  const pii = { ...pack, rules: [{ ...TALENT_CONTEXT_RULES_V1[0], fullName: "forbidden" }] } as unknown as TalentGovernedPolicyPackV1;
  await assert.rejects(new AuraTalentContextCompilerV1(pii, authority).compile(input(), signal()), { code: "PROHIBITED_PII" });
  const dump = { ...pack, graphDump: {} };
  await assert.rejects(new AuraTalentContextCompilerV1(dump, authority).compile(input(), signal()), { code: "MISSING_GOVERNED_CONTEXT" });
});

test("runtime verification rejects unnecessary context even from an injected compiler", () => {
  assert.throws(() => validateTalentCompiledContextV1(pack, input(), authority), { code: "MISSING_GOVERNED_CONTEXT" });
});

test("aborted compilation cannot yield context", async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(new AuraTalentContextCompilerV1(pack, authority).compile(input(), controller.signal), { code: "TIMEOUT" });
});
