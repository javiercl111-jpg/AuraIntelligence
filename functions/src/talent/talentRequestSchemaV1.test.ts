import { strict as assert } from "node:assert";
import { test } from "node:test";

import { TALENT_HARD_STOP_RISK_FLAGS_V1 } from "./talentBridgeConstantsV1.js";
import { TalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";
import {
  validateTalentRequestSchemaV1,
  type TalentRiskFlagV1,
} from "./talentRequestSchemaV1.js";

function validRequest(): Record<string, unknown> {
  return {
    protocol: "HCM_AURA_TALENT_BRIDGE_V1",
    requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
    hcmCompanyId: "company_123",
    evaluationMode: "EVALUATION",
    advisoryOnly: true,
    humanDecisionRequired: true,
    employmentActionAllowed: false,
    scoreBlendingAllowed: false,
    jobProfile: {
      jobProfileRef: "JOB_PROFILE_1",
      requiredSkillRefs: ["SKILL_1"],
      requiredCertificationRefs: ["CERTIFICATION_1"],
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
  };
}

function clone(): Record<string, unknown> {
  return structuredClone(validRequest());
}

function jobProfile(value: Record<string, unknown>): Record<string, unknown> {
  return value.jobProfile as Record<string, unknown>;
}

function threshold(value: Record<string, unknown>): Record<string, unknown> {
  return jobProfile(value).promotionThreshold as Record<string, unknown>;
}

function subject(value: Record<string, unknown>): Record<string, unknown> {
  return (value.subjects as Array<Record<string, unknown>>)[0];
}

function performance(value: Record<string, unknown>): Record<string, unknown> {
  return subject(value).performance as Record<string, unknown>;
}

function hardStops(value: Record<string, unknown>): Record<string, unknown> {
  return subject(value).hardStops as Record<string, unknown>;
}

function assertSchemaViolation(value: unknown): void {
  assert.throws(() => validateTalentRequestSchemaV1(value), (error: unknown) => (
    error instanceof TalentEndpointErrorV1 && error.code === "SCHEMA_VIOLATION"
  ));
}

test("accepts and deeply freezes the exact internal-only canonical request", () => {
  const canonical = validateTalentRequestSchemaV1(validRequest());
  assert.equal(canonical.hcmCompanyId, "company_123");
  assert.equal(canonical.subjects.length, 1);
  assert.equal(canonical.subjects[0].subjectRef, "INTERNAL_1");
  assert.equal(Object.isFrozen(canonical), true);
  assert.equal(Object.isFrozen(canonical.jobProfile), true);
  assert.equal(Object.isFrozen(canonical.jobProfile.requiredSkillRefs), true);
  assert.equal(Object.isFrozen(canonical.subjects), true);
  assert.equal(Object.isFrozen(canonical.subjects[0].performance), true);
  assert.equal(Object.isFrozen(canonical.subjects[0].hardStops.riskFlags), true);
});

test("rejects every missing required field at every object level", () => {
  const levels: Array<readonly [() => Record<string, unknown>, readonly string[]]> = [
    [clone, Object.keys(validRequest())],
    [() => jobProfile(clone()), Object.keys(jobProfile(validRequest()))],
    [() => threshold(clone()), Object.keys(threshold(validRequest()))],
    [() => subject(clone()), Object.keys(subject(validRequest()))],
    [() => performance(clone()), Object.keys(performance(validRequest()))],
    [() => hardStops(clone()), Object.keys(hardStops(validRequest()))],
  ];

  for (const [select, keys] of levels) {
    for (const key of keys) {
      const value = clone();
      let target: Record<string, unknown>;
      if (keys.includes("protocol")) target = value;
      else if (keys.includes("jobProfileRef")) target = jobProfile(value);
      else if (keys.includes("performanceScoreMin")) target = threshold(value);
      else if (keys.includes("subjectRef")) target = subject(value);
      else if (keys.includes("performanceScore")) target = performance(value);
      else target = hardStops(value);
      delete target[key];
      assertSchemaViolation(value);
    }
    assert.ok(select());
  }
});

test("rejects unknown fields at every object depth", () => {
  const mutators = [
    (value: Record<string, unknown>) => { value.unknown = true; },
    (value: Record<string, unknown>) => { jobProfile(value).unknown = true; },
    (value: Record<string, unknown>) => { threshold(value).unknown = true; },
    (value: Record<string, unknown>) => { subject(value).unknown = true; },
    (value: Record<string, unknown>) => { performance(value).unknown = true; },
    (value: Record<string, unknown>) => { hardStops(value).unknown = true; },
  ];
  for (const mutate of mutators) {
    const value = clone();
    mutate(value);
    assertSchemaViolation(value);
  }
});

test("rejects wrong primitive types, non-finite values, fractions, and ranges", () => {
  const mutations = [
    (value: Record<string, unknown>) => { value.requestId = 1; },
    (value: Record<string, unknown>) => { value.advisoryOnly = "true"; },
    (value: Record<string, unknown>) => { value.subjects = {}; },
    (value: Record<string, unknown>) => { jobProfile(value).requiredSkillRefs = "SKILL_1"; },
    (value: Record<string, unknown>) => { threshold(value).performanceScoreMin = Number.NaN; },
    (value: Record<string, unknown>) => { threshold(value).potentialScoreMin = Number.POSITIVE_INFINITY; },
    (value: Record<string, unknown>) => { threshold(value).maxDisciplinaryIncidents = 1.5; },
    (value: Record<string, unknown>) => { performance(value).performanceScore = -1; },
    (value: Record<string, unknown>) => { performance(value).careerScore = 101; },
    (value: Record<string, unknown>) => { performance(value).tenureScore = 4.5; },
    (value: Record<string, unknown>) => { performance(value).riskLevel = "UNKNOWN"; },
    (value: Record<string, unknown>) => { performance(value).matrixCell = "UNKNOWN"; },
    (value: Record<string, unknown>) => { hardStops(value).confidenceImpact = 101; },
  ];
  for (const mutate of mutations) {
    const value = clone();
    mutate(value);
    assertSchemaViolation(value);
  }
});

test("enforces canonical lowercase UUIDv4 request and correlation identifiers", () => {
  for (const invalid of [
    "request-controlled-001",
    "B3B7F26E-6A4F-4B72-9E5C-6D3BAFC14A21",
    "b3b7f26e-6a4f-3b72-9e5c-6d3bafc14a21",
    "b3b7f26e-6a4f-4b72-7e5c-6d3bafc14a21",
    "b3b7f26e6a4f4b729e5c6d3bafc14a21",
  ]) {
    for (const field of ["requestId", "correlationId"] as const) {
      const value = clone();
      value[field] = invalid;
      assertSchemaViolation(value);
    }
  }
});

test("enforces the exact case-sensitive hcmCompanyId transport grammar", () => {
  assert.equal(validateTalentRequestSchemaV1(validRequest()).hcmCompanyId, "company_123");
  assert.equal(validateTalentRequestSchemaV1({
    ...validRequest(),
    hcmCompanyId: "Case.Sensitive-1",
  }).hcmCompanyId, "Case.Sensitive-1");
  for (const invalid of [
    "", " default", "default", "DEFAULT", "*", "company-*", "company/1",
    "company 1", "company\n1", "café", "user@example.com", ".leading",
    "a".repeat(129),
  ]) {
    assertSchemaViolation({ ...validRequest(), hcmCompanyId: invalid });
  }
});

test("requires sequential request-local opaque skill and certification refs", () => {
  const maximum = clone();
  jobProfile(maximum).requiredSkillRefs = Array.from(
    { length: 64 },
    (_, index) => `SKILL_${index + 1}`,
  );
  jobProfile(maximum).requiredCertificationRefs = Array.from(
    { length: 64 },
    (_, index) => `CERTIFICATION_${index + 1}`,
  );
  assert.doesNotThrow(() => validateTalentRequestSchemaV1(maximum));

  for (const refs of [
    ["SKILL_2"],
    ["SKILL_1", "SKILL_1"],
    ["raw-skill-label"],
    Array.from({ length: 65 }, (_, index) => `SKILL_${index + 1}`),
  ]) {
    const value = clone();
    jobProfile(value).requiredSkillRefs = refs;
    assertSchemaViolation(value);
  }
  for (const refs of [["CERTIFICATION_2"], ["CERTIFICATION_1", "CERTIFICATION_1"], ["raw-label"]]) {
    const value = clone();
    jobProfile(value).requiredCertificationRefs = refs;
    assertSchemaViolation(value);
  }
  const excessiveCertifications = clone();
  jobProfile(excessiveCertifications).requiredCertificationRefs = Array.from(
    { length: 65 },
    (_, index) => `CERTIFICATION_${index + 1}`,
  );
  assertSchemaViolation(excessiveCertifications);
});

test("applies LOW_CONFIDENCE, pending, incomplete, then complete evidence precedence", () => {
  const cases: Array<readonly [readonly TalentRiskFlagV1[], string, string]> = [
    [["MISSING_PERFORMANCE_HISTORY", "MANDATORY_CERTIFICATION_PENDING", "LOW_CONFIDENCE"], "REVIEW_REQUIRED", "CONFIDENCE_INSUFFICIENT"],
    [["MISSING_PERFORMANCE_HISTORY", "MANDATORY_CERTIFICATION_PENDING"], "REVIEW_REQUIRED", "VALIDATION_PENDING"],
    [["MISSING_PERFORMANCE_HISTORY"], "REVIEW_REQUIRED", "EVIDENCE_INCOMPLETE"],
    [["DISCIPLINARY_HISTORY_WARNING"], "none", "EVIDENCE_COMPLETE"],
  ];
  for (const [flags, override, quality] of cases) {
    const value = clone();
    const stops = hardStops(value);
    stops.riskFlags = [...flags];
    if (override !== "none") {
      stops.passed = false;
      stops.readinessOverride = override;
    }
    subject(value).evidenceQuality = quality;
    assert.doesNotThrow(() => validateTalentRequestSchemaV1(value));
  }
});

test("rejects external subjects, multiple subjects, competencies, and TECHNICAL_FIT", () => {
  const external = clone();
  subject(external).subjectRef = "EXTERNAL_1";
  subject(external).subjectType = "EXTERNAL";
  assertSchemaViolation(external);

  const multiple = clone();
  (multiple.subjects as unknown[]).push(structuredClone(subject(validRequest())));
  assertSchemaViolation(multiple);

  for (const mutate of [
    (value: Record<string, unknown>) => { value.externalTalent = []; },
    (value: Record<string, unknown>) => { jobProfile(value).competencies = []; },
    (value: Record<string, unknown>) => { performance(value).technicalFit = 80; },
    (value: Record<string, unknown>) => { performance(value).signal = "TECHNICAL_FIT"; },
  ]) {
    const value = clone();
    mutate(value);
    assertSchemaViolation(value);
  }
});

test("rejects stable IDs, caller authority, metadata, narrative, and provider fields", () => {
  for (const field of [
    "employeeId", "candidateId", "userId", "documentId", "id", "tenantId",
    "auraTenantId", "consumerId", "audience", "actor", "metadata", "notes",
    "summary", "prompt", "providerOutput", "reasoning", "unicodeＮame",
  ]) {
    const value = clone();
    subject(value)[field] = "rejected";
    assertSchemaViolation(value);
  }
});

function expectedQuality(flag: TalentRiskFlagV1): string {
  if (flag === "LOW_CONFIDENCE") return "CONFIDENCE_INSUFFICIENT";
  if (flag === "MANDATORY_CERTIFICATION_PENDING" || flag === "CRITICAL_SKILL_PENDING") {
    return "VALIDATION_PENDING";
  }
  if ([
    "INSUFFICIENT_PERFORMANCE_HISTORY",
    "MISSING_PERFORMANCE_HISTORY",
    "INCOMPLETE_TALENT_DATA",
    "MISSING_MANAGER",
  ].includes(flag)) return "EVIDENCE_INCOMPLETE";
  return "EVIDENCE_COMPLETE";
}

const blocking = new Set<TalentRiskFlagV1>([
  "LOW_PERFORMANCE_UNDER_THRESHOLD", "LOW_POTENTIAL_UNDER_THRESHOLD",
  "LOW_READINESS_UNDER_THRESHOLD", "MANDATORY_CERTIFICATION_MISSING",
  "MANDATORY_CERTIFICATION_EXPIRED", "MANDATORY_CERTIFICATION_REJECTED",
  "CRITICAL_SKILL_MISSING", "DISCIPLINARY_INCIDENTS_EXCEEDED",
  "SEVERE_DISCIPLINARY_INCIDENT_RECENT",
]);

test("accepts every controlled flag with its ratified minimum override", () => {
  for (const flag of TALENT_HARD_STOP_RISK_FLAGS_V1) {
    const value = clone();
    const stops = hardStops(value);
    stops.riskFlags = [flag];
    if (blocking.has(flag)) {
      stops.passed = false;
      stops.readinessOverride = "NOT_READY";
    } else if (flag !== "DISCIPLINARY_HISTORY_WARNING") {
      stops.passed = false;
      stops.readinessOverride = "REVIEW_REQUIRED";
    }
    subject(value).evidenceQuality = expectedQuality(flag);
    assert.doesNotThrow(() => validateTalentRequestSchemaV1(value));
  }
});

test("enforces hard-stop passed, override, uniqueness, order, and evidence precedence", () => {
  const mutations = [
    (value: Record<string, unknown>) => { hardStops(value).passed = true; hardStops(value).readinessOverride = "REVIEW_REQUIRED"; },
    (value: Record<string, unknown>) => { hardStops(value).passed = false; hardStops(value).readinessOverride = null; },
    (value: Record<string, unknown>) => { hardStops(value).passed = false; hardStops(value).readinessOverride = "NOT_READY"; },
    (value: Record<string, unknown>) => { hardStops(value).riskFlags = ["LOW_PERFORMANCE_UNDER_THRESHOLD"]; },
    (value: Record<string, unknown>) => { hardStops(value).riskFlags = ["MISSING_MANAGER"]; },
    (value: Record<string, unknown>) => { hardStops(value).riskFlags = ["UNKNOWN_FLAG"]; },
    (value: Record<string, unknown>) => { hardStops(value).riskFlags = ["MISSING_MANAGER", "MISSING_MANAGER"]; },
    (value: Record<string, unknown>) => { hardStops(value).riskFlags = ["LOW_CONFIDENCE", "MISSING_MANAGER"]; },
    (value: Record<string, unknown>) => { subject(value).evidenceQuality = "VALIDATION_PENDING"; },
  ];
  for (const mutate of mutations) {
    const value = clone();
    mutate(value);
    assertSchemaViolation(value);
  }
});

test("preserves a valid canonical hard-stop object byte-for-byte", () => {
  const value = clone();
  const stops = hardStops(value);
  stops.passed = false;
  stops.readinessOverride = "NOT_READY";
  stops.riskFlags = [
    "MANDATORY_CERTIFICATION_MISSING",
    "MANDATORY_CERTIFICATION_PENDING",
    "DISCIPLINARY_HISTORY_WARNING",
    "LOW_CONFIDENCE",
  ];
  stops.confidenceImpact = 63;
  subject(value).evidenceQuality = "CONFIDENCE_INSUFFICIENT";
  const before = JSON.stringify(stops);
  const canonical = validateTalentRequestSchemaV1(value);
  assert.equal(JSON.stringify(canonical.subjects[0].hardStops), before);
});

test("requires every ratified protocol and governance constant", () => {
  const fields: Array<readonly [string, unknown]> = [
    ["protocol", "OTHER"],
    ["evaluationMode", "SCORING"],
    ["advisoryOnly", false],
    ["humanDecisionRequired", false],
    ["employmentActionAllowed", true],
    ["scoreBlendingAllowed", true],
  ];
  for (const [field, replacement] of fields) {
    const value = clone();
    value[field] = replacement;
    assertSchemaViolation(value);
  }
});
