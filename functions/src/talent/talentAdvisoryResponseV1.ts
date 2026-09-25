import { Buffer } from "node:buffer";
import {
  exactTalentAIRecordV1, snapshotTalentAIJsonV1, TALENT_AI_GUARANTEES_V1,
  type TalentAIFindingV1, type ValidatedTalentAICandidateV1,
} from "./talentAIRuntimeContractsV1.js";
import { TALENT_BRIDGE_PROTOCOL_V1 } from "./talentBridgeConstantsV1.js";
import { enforceTalentPiiGovernanceV1 } from "./talentPiiGovernanceV1.js";
import { validateTalentRequestSchemaV1, type TalentCanonicalRequestV1 } from "./talentRequestSchemaV1.js";

export const TALENT_ADVISORY_HTTP_SCHEMA_V1 = "HCM_AURA_TALENT_ADVISORY_V1";
export const TALENT_ADVISORY_MAX_BODY_BYTES_V1 = 16 * 1_024;

export interface TalentAdvisoryResponseV1 {
  readonly protocol: "HCM_AURA_TALENT_BRIDGE_V1";
  readonly schemaVersion: "HCM_AURA_TALENT_ADVISORY_V1";
  readonly requestId: string;
  readonly correlationId: string;
  readonly advisoryOnly: true;
  readonly humanDecisionRequired: true;
  readonly employmentActionAllowed: false;
  readonly scoreBlendingAllowed: false;
  readonly advisory: ValidatedTalentAICandidateV1;
}

function invalid(): never { throw new Error("Invalid governed advisory response."); }

export function snapshotTalentAdvisoryRequestV1(value: unknown): TalentCanonicalRequestV1 {
  const snapshot = snapshotTalentAIJsonV1(value, 262_144, "SCHEMA_VIOLATION");
  enforceTalentPiiGovernanceV1(snapshot);
  return validateTalentRequestSchemaV1(snapshot);
}

function guarantees(record: Record<string, unknown>): void {
  if (record.advisoryOnly !== true || record.humanDecisionRequired !== true ||
      record.employmentActionAllowed !== false || record.scoreBlendingAllowed !== false) invalid();
}

function validateAdvisory(value: unknown, request: TalentCanonicalRequestV1): ValidatedTalentAICandidateV1 {
  const record = exactTalentAIRecordV1(value, ["schemaVersion", "subjectRef", "findings"]);
  if (record.schemaVersion !== "TALENT_AI_CANDIDATE_V1" || record.subjectRef !== "INTERNAL_1" ||
      !Array.isArray(record.findings) || record.findings.length > 2) return invalid();
  const expected: TalentAIFindingV1[] = [];
  const subject = request.subjects[0];
  if (!subject.hardStops.passed) expected.push(Object.freeze({
    code: "HARD_STOP_PRESENT", evidenceRefs: Object.freeze(["HARD_STOP_1"] as const),
    contextRefs: Object.freeze(["CONTEXT_HARD_STOPS"] as const),
  }));
  if (subject.evidenceQuality !== "EVIDENCE_COMPLETE") expected.push(Object.freeze({
    code: "EVIDENCE_LIMITATION", evidenceRefs: Object.freeze(["HARD_STOP_1"] as const),
    contextRefs: Object.freeze(["CONTEXT_EVIDENCE_QUALITY"] as const),
  }));
  const findings = record.findings;
  if (findings.length !== expected.length) return invalid();
  expected.forEach((finding, index) => {
    const actual = exactTalentAIRecordV1(findings[index], ["code", "evidenceRefs", "contextRefs"]);
    if (actual.code !== finding.code || !Array.isArray(actual.evidenceRefs) ||
        actual.evidenceRefs.length !== 1 || actual.evidenceRefs[0] !== finding.evidenceRefs[0] ||
        !Array.isArray(actual.contextRefs) || actual.contextRefs.length !== 1 ||
        actual.contextRefs[0] !== finding.contextRefs[0]) invalid();
  });
  return Object.freeze({ schemaVersion: "TALENT_AI_CANDIDATE_V1", subjectRef: "INTERNAL_1", findings: Object.freeze(expected) });
}

function construct(request: TalentCanonicalRequestV1, advisory: ValidatedTalentAICandidateV1): TalentAdvisoryResponseV1 {
  // Property order is part of canonical body serialization, including nested findings.
  return Object.freeze({
    protocol: TALENT_BRIDGE_PROTOCOL_V1,
    schemaVersion: TALENT_ADVISORY_HTTP_SCHEMA_V1,
    requestId: request.requestId,
    correlationId: request.correlationId,
    ...TALENT_AI_GUARANTEES_V1,
    advisory,
  });
}

export function projectTalentAdvisoryResponseV1(
  runtimeResult: unknown, canonicalRequest: TalentCanonicalRequestV1,
): TalentAdvisoryResponseV1 {
  const request = snapshotTalentAdvisoryRequestV1(canonicalRequest);
  const snapshot = snapshotTalentAIJsonV1(runtimeResult, TALENT_ADVISORY_MAX_BODY_BYTES_V1, "SCHEMA_VIOLATION");
  enforceTalentPiiGovernanceV1(snapshot);
  const result = exactTalentAIRecordV1(snapshot, [
    "kind", "schemaVersion", "advisoryOnly", "humanDecisionRequired", "employmentActionAllowed", "scoreBlendingAllowed", "advisory",
  ]);
  if (result.kind !== "ADVISORY_VALIDATED" || result.schemaVersion !== "TALENT_AI_RUNTIME_RESULT_V1") return invalid();
  guarantees(result);
  return construct(request, validateAdvisory(result.advisory, request));
}

export function validateTalentAdvisoryResponseV1(
  value: unknown, canonicalRequest: TalentCanonicalRequestV1,
): TalentAdvisoryResponseV1 {
  const request = snapshotTalentAdvisoryRequestV1(canonicalRequest);
  const snapshot = snapshotTalentAIJsonV1(value, TALENT_ADVISORY_MAX_BODY_BYTES_V1, "SCHEMA_VIOLATION");
  enforceTalentPiiGovernanceV1(snapshot);
  const record = exactTalentAIRecordV1(snapshot, [
    "protocol", "schemaVersion", "requestId", "correlationId", "advisoryOnly", "humanDecisionRequired",
    "employmentActionAllowed", "scoreBlendingAllowed", "advisory",
  ]);
  if (record.protocol !== TALENT_BRIDGE_PROTOCOL_V1 || record.schemaVersion !== TALENT_ADVISORY_HTTP_SCHEMA_V1 ||
      record.requestId !== request.requestId || record.correlationId !== request.correlationId) return invalid();
  guarantees(record);
  return construct(request, validateAdvisory(record.advisory, request));
}

export function serializeTalentAdvisoryResponseV1(value: unknown, request: TalentCanonicalRequestV1): string {
  const body = JSON.stringify(validateTalentAdvisoryResponseV1(value, request));
  if (Buffer.byteLength(body, "utf8") > TALENT_ADVISORY_MAX_BODY_BYTES_V1) return invalid();
  return body;
}

/** Reject noncanonical bodies, including whitespace, alternate ordering and duplicate keys. */
export function validateTalentAdvisoryBodyV1(body: unknown, request: TalentCanonicalRequestV1): string {
  if (typeof body !== "string" || Buffer.byteLength(body, "utf8") > TALENT_ADVISORY_MAX_BODY_BYTES_V1) return invalid();
  const canonical = serializeTalentAdvisoryResponseV1(JSON.parse(body) as unknown, request);
  if (canonical !== body) return invalid();
  return body;
}
