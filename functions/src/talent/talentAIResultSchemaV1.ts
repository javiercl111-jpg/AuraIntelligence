import {
  exactTalentAIRecordV1,
  snapshotTalentAIJsonV1,
  TALENT_AI_GUARANTEES_V1,
  TALENT_AI_MAX_OUTPUT_BYTES_V1,
  TalentAIRuntimeErrorV1,
  type TalentAIFindingV1,
  type TalentAIRuntimeFailureCodeV1,
  type TalentAIRuntimeResultV1,
  type TalentCompiledContextV1,
  type ValidatedTalentAICandidateV1,
} from "./talentAIRuntimeContractsV1.js";
import { enforceTalentPiiGovernanceV1 } from "./talentPiiGovernanceV1.js";
import type { TalentCanonicalRequestV1 } from "./talentRequestSchemaV1.js";

export function validateTalentAIResultV1(
  raw: unknown,
  request: TalentCanonicalRequestV1,
  context: TalentCompiledContextV1,
): ValidatedTalentAICandidateV1 {
  const snapshot = snapshotTalentAIJsonV1(
    raw, TALENT_AI_MAX_OUTPUT_BYTES_V1, "MALFORMED_PROVIDER_OUTPUT",
  );
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
    throw new TalentAIRuntimeErrorV1("MALFORMED_PROVIDER_OUTPUT");
  }
  if (["toolCalls", "tool_calls", "tools", "function_call"].some(
    (key) => Object.prototype.hasOwnProperty.call(snapshot, key),
  )) throw new TalentAIRuntimeErrorV1("TOOL_FAILURE");
  enforceTalentPiiGovernanceV1(snapshot);
  const candidate = exactTalentAIRecordV1(snapshot, ["schemaVersion", "subjectRef", "findings"]);
  const invalid = (): never => { throw new TalentAIRuntimeErrorV1("SCHEMA_VIOLATION"); };
  if (candidate.schemaVersion !== "TALENT_AI_CANDIDATE_V1" ||
      candidate.subjectRef !== "INTERNAL_1" || !Array.isArray(candidate.findings) ||
      candidate.findings.length > 2) return invalid();

  const findings = candidate.findings;
  const subject = request.subjects[0];
  const expected: TalentAIFindingV1[] = [];
  if (!subject.hardStops.passed) {
    expected.push(Object.freeze({
      code: "HARD_STOP_PRESENT",
      evidenceRefs: Object.freeze(["HARD_STOP_1"] as const),
      contextRefs: Object.freeze(["CONTEXT_HARD_STOPS"] as const),
    }));
  }
  if (subject.evidenceQuality !== "EVIDENCE_COMPLETE") {
    expected.push(Object.freeze({
      code: "EVIDENCE_LIMITATION",
      evidenceRefs: Object.freeze(["HARD_STOP_1"] as const),
      contextRefs: Object.freeze(["CONTEXT_EVIDENCE_QUALITY"] as const),
    }));
  }
  if (findings.length !== expected.length) return invalid();
  expected.forEach((finding, index) => {
    const actual = exactTalentAIRecordV1(findings[index], [
      "code", "evidenceRefs", "contextRefs",
    ]);
    if (actual.code !== finding.code ||
        !Array.isArray(actual.evidenceRefs) || actual.evidenceRefs.length !== 1 ||
        actual.evidenceRefs[0] !== finding.evidenceRefs[0] ||
        !Array.isArray(actual.contextRefs) || actual.contextRefs.length !== 1 ||
        actual.contextRefs[0] !== finding.contextRefs[0]) return invalid();
    if (!context.rules.some((rule) => rule.ref === finding.contextRefs[0])) {
      throw new TalentAIRuntimeErrorV1("MISSING_GOVERNED_CONTEXT");
    }
  });
  return Object.freeze({
    schemaVersion: "TALENT_AI_CANDIDATE_V1",
    subjectRef: "INTERNAL_1",
    findings: Object.freeze(expected),
  });
}

export function failedTalentAIResultV1(code: TalentAIRuntimeFailureCodeV1): TalentAIRuntimeResultV1 {
  return Object.freeze({
    kind: "FAILED",
    schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    ...TALENT_AI_GUARANTEES_V1,
    code,
  });
}

export function validatedTalentAIResultV1(
  advisory: ValidatedTalentAICandidateV1,
): TalentAIRuntimeResultV1 {
  return Object.freeze({
    kind: "ADVISORY_VALIDATED",
    schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    ...TALENT_AI_GUARANTEES_V1,
    advisory,
  });
}
