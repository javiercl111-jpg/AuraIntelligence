import {
  TALENT_ADVISORY_ONLY_V1,
  TALENT_BRIDGE_PROTOCOL_V1,
  TALENT_EMPLOYMENT_ACTION_ALLOWED_V1,
  TALENT_EVALUATION_MODE_V1,
  TALENT_EVIDENCE_QUALITY_VALUES_V1,
  TALENT_HARD_STOP_EVIDENCE_REF_V1,
  TALENT_HARD_STOP_RISK_FLAGS_V1,
  TALENT_HUMAN_DECISION_REQUIRED_V1,
  TALENT_JOB_PROFILE_REF_V1,
  TALENT_MATRIX_CELLS_V1,
  TALENT_PERFORMANCE_EVIDENCE_REF_V1,
  TALENT_RISK_LEVELS_V1,
  TALENT_SCORE_BLENDING_ALLOWED_V1,
  TALENT_SUBJECT_REF_V1,
  TALENT_SUBJECT_TYPE_V1,
} from "./talentBridgeConstantsV1.js";
import { throwTalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";

export type TalentRiskFlagV1 = typeof TALENT_HARD_STOP_RISK_FLAGS_V1[number];
export type TalentEvidenceQualityV1 = typeof TALENT_EVIDENCE_QUALITY_VALUES_V1[number];
export type TalentRiskLevelV1 = typeof TALENT_RISK_LEVELS_V1[number];
export type TalentMatrixCellV1 = typeof TALENT_MATRIX_CELLS_V1[number];
export type TalentReadinessOverrideV1 = "NOT_READY" | "REVIEW_REQUIRED" | null;

export interface TalentPromotionThresholdV1 {
  readonly performanceScoreMin: number;
  readonly potentialScoreMin: number;
  readonly promotionReadinessMin: number;
  readonly maxDisciplinaryIncidents: number;
}

export interface TalentJobProfileV1 {
  readonly jobProfileRef: "JOB_PROFILE_1";
  readonly requiredSkillRefs: readonly string[];
  readonly requiredCertificationRefs: readonly string[];
  readonly promotionThreshold: TalentPromotionThresholdV1;
}

export interface TalentPerformanceV1 {
  readonly evidenceRef: "PERFORMANCE_1";
  readonly performanceScore: number;
  readonly potentialScore: number;
  readonly promotionReadiness: number;
  readonly attendanceScore: number;
  readonly documentationScore: number;
  readonly disciplineScore: number;
  readonly tenureScore: number;
  readonly careerScore: number;
  readonly riskLevel: TalentRiskLevelV1;
  readonly matrixCell: TalentMatrixCellV1;
}

export interface TalentHardStopsV1 {
  readonly evidenceRef: "HARD_STOP_1";
  readonly passed: boolean;
  readonly readinessOverride: TalentReadinessOverrideV1;
  readonly riskFlags: readonly TalentRiskFlagV1[];
  readonly confidenceImpact: number;
}

export interface TalentSubjectV1 {
  readonly subjectRef: "INTERNAL_1";
  readonly subjectType: "INTERNAL";
  readonly performance: TalentPerformanceV1;
  readonly hardStops: TalentHardStopsV1;
  readonly evidenceQuality: TalentEvidenceQualityV1;
}

export interface TalentCanonicalRequestV1 {
  readonly protocol: "HCM_AURA_TALENT_BRIDGE_V1";
  readonly requestId: string;
  readonly correlationId: string;
  readonly hcmCompanyId: string;
  readonly evaluationMode: "EVALUATION";
  readonly advisoryOnly: true;
  readonly humanDecisionRequired: true;
  readonly employmentActionAllowed: false;
  readonly scoreBlendingAllowed: false;
  readonly jobProfile: TalentJobProfileV1;
  readonly subjects: readonly [TalentSubjectV1];
}

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const HCM_COMPANY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

const blockingFlags = new Set<TalentRiskFlagV1>([
  "LOW_PERFORMANCE_UNDER_THRESHOLD",
  "LOW_POTENTIAL_UNDER_THRESHOLD",
  "LOW_READINESS_UNDER_THRESHOLD",
  "MANDATORY_CERTIFICATION_MISSING",
  "MANDATORY_CERTIFICATION_EXPIRED",
  "MANDATORY_CERTIFICATION_REJECTED",
  "CRITICAL_SKILL_MISSING",
  "DISCIPLINARY_INCIDENTS_EXCEEDED",
  "SEVERE_DISCIPLINARY_INCIDENT_RECENT",
]);

const reviewOnlyFlags = new Set<TalentRiskFlagV1>([
  "INSUFFICIENT_PERFORMANCE_HISTORY",
  "MISSING_PERFORMANCE_HISTORY",
  "MANDATORY_CERTIFICATION_PENDING",
  "CRITICAL_SKILL_PENDING",
  "INCOMPLETE_TALENT_DATA",
  "MISSING_MANAGER",
  "LOW_CONFIDENCE",
]);

const pendingEvidenceFlags = new Set<TalentRiskFlagV1>([
  "MANDATORY_CERTIFICATION_PENDING",
  "CRITICAL_SKILL_PENDING",
]);

const incompleteEvidenceFlags = new Set<TalentRiskFlagV1>([
  "INSUFFICIENT_PERFORMANCE_HISTORY",
  "MISSING_PERFORMANCE_HISTORY",
  "INCOMPLETE_TALENT_DATA",
  "MISSING_MANAGER",
]);

function schemaViolation(): never {
  return throwTalentEndpointErrorV1("SCHEMA_VIOLATION");
}

function asExactRecord(
  value: unknown,
  requiredKeys: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return schemaViolation();
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record);
  if (
    actualKeys.length !== requiredKeys.length ||
    !requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(record, key))
  ) {
    return schemaViolation();
  }
  return record;
}

function requireLiteral<T extends string | boolean>(
  value: unknown,
  literal: T,
): T {
  if (value !== literal) return schemaViolation();
  return literal;
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return schemaViolation();
  }
  return value as T;
}

function requireBoundedNumber(value: unknown, integer: boolean): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100 ||
    (integer && !Number.isInteger(value))
  ) {
    return schemaViolation();
  }
  return value;
}

function requireUuidV4(value: unknown): string {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    return schemaViolation();
  }
  return value;
}

function requireHcmCompanyId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !HCM_COMPANY_PATTERN.test(value) ||
    value.toLowerCase() === "default" ||
    value.includes("@")
  ) {
    return schemaViolation();
  }
  return value;
}

function requireSequentialRefs(
  value: unknown,
  prefix: "SKILL" | "CERTIFICATION",
): readonly string[] {
  if (!Array.isArray(value) || value.length > 64) {
    return schemaViolation();
  }
  const canonical = value.map((item, index) => {
    const expected = `${prefix}_${index + 1}`;
    if (item !== expected) return schemaViolation();
    return expected;
  });
  return Object.freeze(canonical);
}

function validatePromotionThreshold(value: unknown): TalentPromotionThresholdV1 {
  const record = asExactRecord(value, [
    "performanceScoreMin",
    "potentialScoreMin",
    "promotionReadinessMin",
    "maxDisciplinaryIncidents",
  ]);
  return Object.freeze({
    performanceScoreMin: requireBoundedNumber(record.performanceScoreMin, false),
    potentialScoreMin: requireBoundedNumber(record.potentialScoreMin, false),
    promotionReadinessMin: requireBoundedNumber(record.promotionReadinessMin, false),
    maxDisciplinaryIncidents: requireBoundedNumber(
      record.maxDisciplinaryIncidents,
      true,
    ),
  });
}

function validateJobProfile(value: unknown): TalentJobProfileV1 {
  const record = asExactRecord(value, [
    "jobProfileRef",
    "requiredSkillRefs",
    "requiredCertificationRefs",
    "promotionThreshold",
  ]);
  return Object.freeze({
    jobProfileRef: requireLiteral(record.jobProfileRef, TALENT_JOB_PROFILE_REF_V1),
    requiredSkillRefs: requireSequentialRefs(record.requiredSkillRefs, "SKILL"),
    requiredCertificationRefs: requireSequentialRefs(
      record.requiredCertificationRefs,
      "CERTIFICATION",
    ),
    promotionThreshold: validatePromotionThreshold(record.promotionThreshold),
  });
}

function validatePerformance(value: unknown): TalentPerformanceV1 {
  const record = asExactRecord(value, [
    "evidenceRef",
    "performanceScore",
    "potentialScore",
    "promotionReadiness",
    "attendanceScore",
    "documentationScore",
    "disciplineScore",
    "tenureScore",
    "careerScore",
    "riskLevel",
    "matrixCell",
  ]);
  return Object.freeze({
    evidenceRef: requireLiteral(
      record.evidenceRef,
      TALENT_PERFORMANCE_EVIDENCE_REF_V1,
    ),
    performanceScore: requireBoundedNumber(record.performanceScore, true),
    potentialScore: requireBoundedNumber(record.potentialScore, true),
    promotionReadiness: requireBoundedNumber(record.promotionReadiness, true),
    attendanceScore: requireBoundedNumber(record.attendanceScore, true),
    documentationScore: requireBoundedNumber(record.documentationScore, true),
    disciplineScore: requireBoundedNumber(record.disciplineScore, true),
    tenureScore: requireBoundedNumber(record.tenureScore, true),
    careerScore: requireBoundedNumber(record.careerScore, true),
    riskLevel: requireEnum(record.riskLevel, TALENT_RISK_LEVELS_V1),
    matrixCell: requireEnum(record.matrixCell, TALENT_MATRIX_CELLS_V1),
  });
}

function validateRiskFlags(value: unknown): readonly TalentRiskFlagV1[] {
  if (!Array.isArray(value) || value.length > TALENT_HARD_STOP_RISK_FLAGS_V1.length) {
    return schemaViolation();
  }
  let previousIndex = -1;
  const flags = value.map((item) => {
    const flag = requireEnum(item, TALENT_HARD_STOP_RISK_FLAGS_V1);
    const index = TALENT_HARD_STOP_RISK_FLAGS_V1.indexOf(flag);
    if (index <= previousIndex) return schemaViolation();
    previousIndex = index;
    return flag;
  });
  return Object.freeze(flags);
}

function expectedEvidenceQuality(
  flags: readonly TalentRiskFlagV1[],
): TalentEvidenceQualityV1 {
  if (flags.includes("LOW_CONFIDENCE")) return "CONFIDENCE_INSUFFICIENT";
  if (flags.some((flag) => pendingEvidenceFlags.has(flag))) {
    return "VALIDATION_PENDING";
  }
  if (flags.some((flag) => incompleteEvidenceFlags.has(flag))) {
    return "EVIDENCE_INCOMPLETE";
  }
  return "EVIDENCE_COMPLETE";
}

function validateHardStops(
  value: unknown,
): { readonly hardStops: TalentHardStopsV1; readonly expectedQuality: TalentEvidenceQualityV1 } {
  const record = asExactRecord(value, [
    "evidenceRef",
    "passed",
    "readinessOverride",
    "riskFlags",
    "confidenceImpact",
  ]);
  if (typeof record.passed !== "boolean") return schemaViolation();
  const readinessOverride = record.readinessOverride === null
    ? null
    : requireEnum(record.readinessOverride, ["NOT_READY", "REVIEW_REQUIRED"] as const);
  const riskFlags = validateRiskFlags(record.riskFlags);
  const hasBlockingFlag = riskFlags.some((flag) => blockingFlags.has(flag));
  const hasReviewOnlyFlag = riskFlags.some((flag) => reviewOnlyFlags.has(flag));

  if (record.passed !== (readinessOverride === null)) return schemaViolation();
  if (hasBlockingFlag && readinessOverride !== "NOT_READY") {
    return schemaViolation();
  }
  if (
    !hasBlockingFlag &&
    hasReviewOnlyFlag &&
    readinessOverride !== "REVIEW_REQUIRED"
  ) {
    return schemaViolation();
  }
  if (
    readinessOverride === "NOT_READY" &&
    !hasBlockingFlag
  ) {
    return schemaViolation();
  }
  if (
    readinessOverride === "REVIEW_REQUIRED" &&
    (hasBlockingFlag || !hasReviewOnlyFlag)
  ) {
    return schemaViolation();
  }

  return Object.freeze({
    hardStops: Object.freeze({
      evidenceRef: requireLiteral(
        record.evidenceRef,
        TALENT_HARD_STOP_EVIDENCE_REF_V1,
      ),
      passed: record.passed,
      readinessOverride,
      riskFlags,
      confidenceImpact: requireBoundedNumber(record.confidenceImpact, true),
    }),
    expectedQuality: expectedEvidenceQuality(riskFlags),
  });
}

function validateSubject(value: unknown): TalentSubjectV1 {
  const record = asExactRecord(value, [
    "subjectRef",
    "subjectType",
    "performance",
    "hardStops",
    "evidenceQuality",
  ]);
  const hardStopValidation = validateHardStops(record.hardStops);
  const evidenceQuality = requireEnum(
    record.evidenceQuality,
    TALENT_EVIDENCE_QUALITY_VALUES_V1,
  );
  if (evidenceQuality !== hardStopValidation.expectedQuality) {
    return schemaViolation();
  }
  return Object.freeze({
    subjectRef: requireLiteral(record.subjectRef, TALENT_SUBJECT_REF_V1),
    subjectType: requireLiteral(record.subjectType, TALENT_SUBJECT_TYPE_V1),
    performance: validatePerformance(record.performance),
    hardStops: hardStopValidation.hardStops,
    evidenceQuality,
  });
}

export function validateTalentRequestSchemaV1(
  value: unknown,
): TalentCanonicalRequestV1 {
  const record = asExactRecord(value, [
    "protocol",
    "requestId",
    "correlationId",
    "hcmCompanyId",
    "evaluationMode",
    "advisoryOnly",
    "humanDecisionRequired",
    "employmentActionAllowed",
    "scoreBlendingAllowed",
    "jobProfile",
    "subjects",
  ]);
  if (!Array.isArray(record.subjects) || record.subjects.length !== 1) {
    return schemaViolation();
  }
  const subject = validateSubject(record.subjects[0]);
  return Object.freeze({
    protocol: requireLiteral(record.protocol, TALENT_BRIDGE_PROTOCOL_V1),
    requestId: requireUuidV4(record.requestId),
    correlationId: requireUuidV4(record.correlationId),
    hcmCompanyId: requireHcmCompanyId(record.hcmCompanyId),
    evaluationMode: requireLiteral(record.evaluationMode, TALENT_EVALUATION_MODE_V1),
    advisoryOnly: requireLiteral(record.advisoryOnly, TALENT_ADVISORY_ONLY_V1),
    humanDecisionRequired: requireLiteral(
      record.humanDecisionRequired,
      TALENT_HUMAN_DECISION_REQUIRED_V1,
    ),
    employmentActionAllowed: requireLiteral(
      record.employmentActionAllowed,
      TALENT_EMPLOYMENT_ACTION_ALLOWED_V1,
    ),
    scoreBlendingAllowed: requireLiteral(
      record.scoreBlendingAllowed,
      TALENT_SCORE_BLENDING_ALLOWED_V1,
    ),
    jobProfile: validateJobProfile(record.jobProfile),
    subjects: Object.freeze([subject] as [TalentSubjectV1]),
  });
}
