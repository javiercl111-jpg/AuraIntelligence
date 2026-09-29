import assert from "node:assert/strict";
import test from "node:test";

import {
  TALENT_AI_DEADLINE_MS_V1,
  TALENT_AI_MAX_OUTPUT_BYTES_V1,
  type TalentContextAuthorityV1,
} from "./talentAIRuntimeContractsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import {
  TALENT_AI_GOLDEN_CASE_SCHEMA_VERSION_V1,
  TALENT_AI_REQUIRED_GOLDEN_CASE_ASSERTIONS_V1,
  defineTalentAIGoldenCaseV1,
  validateTalentAIGoldenCaseCoverageV1,
  type TalentAIGoldenCaseAssertionV1,
  type TalentAIGoldenCaseV1,
} from "./talentAIGoldenCasesV1.js";

const executionInput: TalentExecutionInputV1 = {
  environment: "preview",
  authenticatedConsumerId: "consumer-1",
  auraTenantId: "tenant-1",
  canonicalRequest: {
    protocol: "HCM_AURA_TALENT_BRIDGE_V1",
    requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
    hcmCompanyId: "company-1",
    evaluationMode: "EVALUATION",
    advisoryOnly: true,
    humanDecisionRequired: true,
    employmentActionAllowed: false,
    scoreBlendingAllowed: false,
    jobProfile: {
      jobProfileRef: "JOB_PROFILE_1",
      requiredSkillRefs: [],
      requiredCertificationRefs: [],
      promotionThreshold: {
        performanceScoreMin: 80,
        potentialScoreMin: 75,
        promotionReadinessMin: 80,
        maxDisciplinaryIncidents: 1,
      },
    },
    subjects: [{
      subjectRef: "INTERNAL_1",
      subjectType: "INTERNAL",
      performance: {
        evidenceRef: "PERFORMANCE_1",
        performanceScore: 84,
        potentialScore: 80,
        promotionReadiness: 82,
        attendanceScore: 92,
        documentationScore: 80,
        disciplineScore: 100,
        tenureScore: 78,
        careerScore: 82,
        riskLevel: "LOW",
        matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL",
      },
      hardStops: {
        evidenceRef: "HARD_STOP_1",
        passed: true,
        readinessOverride: null,
        riskFlags: [],
        confidenceImpact: 0,
      },
      evidenceQuality: "EVIDENCE_COMPLETE",
    }],
  },
};

const contextAuthority: TalentContextAuthorityV1 = {
  scope: {
    environment: "preview",
    authenticatedConsumerId: "consumer-1",
    hcmCompanyId: "company-1",
    auraTenantId: "tenant-1",
  },
  policyRevision: "golden-v1",
};

function goldenCase(
  caseId: string,
  assertion: TalentAIGoldenCaseAssertionV1,
): TalentAIGoldenCaseV1 {
  return {
    schemaVersion: TALENT_AI_GOLDEN_CASE_SCHEMA_VERSION_V1,
    caseId,
    description: `Golden case ${caseId}`,
    executionInput,
    contextAuthority,
    expectedOutcomeClass: "FAILED",
    expectedFailureCode: "INTERNAL_FAILURE",
    maxProviderInvocations: 1,
    deadlineMs: TALENT_AI_DEADLINE_MS_V1,
    maxOutputBytes: TALENT_AI_MAX_OUTPUT_BYTES_V1,
    assertions: [assertion],
  };
}

test("captures provider-neutral Golden Case contract", () => {
  const value = defineTalentAIGoldenCaseV1(
    goldenCase("tenant", "TENANT_SCOPE"),
  );

  assert.equal(value.maxProviderInvocations, 1);
  assert.equal(value.deadlineMs, TALENT_AI_DEADLINE_MS_V1);
  assert.equal(value.maxOutputBytes, TALENT_AI_MAX_OUTPUT_BYTES_V1);
  assert.equal(
    value.executionInput.auraTenantId,
    value.contextAuthority.scope.auraTenantId,
  );
});

test("requires failure code for FAILED", () => {
  assert.throws(
    () => defineTalentAIGoldenCaseV1({
      ...goldenCase("failure", "FAIL_CLOSED"),
      expectedFailureCode: null,
    }),
    /GOLDEN_CASE_FAILURE_CODE_REQUIRED/,
  );
});

test("rejects failure code for validated outcome", () => {
  assert.throws(
    () => defineTalentAIGoldenCaseV1({
      ...goldenCase("success", "CONTEXT_GOVERNANCE"),
      expectedOutcomeClass: "ADVISORY_VALIDATED",
      expectedFailureCode: "INTERNAL_FAILURE",
    }),
    /GOLDEN_CASE_SUCCESS_FAILURE_CODE_INVALID/,
  );
});

test("defines seven required validation dimensions", () => {
  assert.equal(
    TALENT_AI_REQUIRED_GOLDEN_CASE_ASSERTIONS_V1.length,
    7,
  );
});

test("accepts complete provider-neutral coverage", () => {
  const cases =
    TALENT_AI_REQUIRED_GOLDEN_CASE_ASSERTIONS_V1.map(
      (assertion, index) =>
        defineTalentAIGoldenCaseV1(
          goldenCase(`case-${index + 1}`, assertion),
        ),
    );

  assert.doesNotThrow(() =>
    validateTalentAIGoldenCaseCoverageV1(cases),
  );
});

test("rejects incomplete coverage", () => {
  assert.throws(
    () => validateTalentAIGoldenCaseCoverageV1([
      defineTalentAIGoldenCaseV1(
        goldenCase("tenant-only", "TENANT_SCOPE"),
      ),
    ]),
    /GOLDEN_CASE_COVERAGE_MISSING:/,
  );
});

test("rejects duplicate identifiers", () => {
  assert.throws(
    () => validateTalentAIGoldenCaseCoverageV1([
      defineTalentAIGoldenCaseV1(
        goldenCase("duplicate", "TENANT_SCOPE"),
      ),
      defineTalentAIGoldenCaseV1(
        goldenCase("duplicate", "CONTEXT_GOVERNANCE"),
      ),
    ]),
    /GOLDEN_CASE_ID_DUPLICATE/,
  );
});