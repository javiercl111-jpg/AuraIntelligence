import {
  TALENT_AI_DEADLINE_MS_V1,
  TALENT_AI_MAX_OUTPUT_BYTES_V1,
  type TalentAIRuntimeFailureCodeV1,
  type TalentContextAuthorityV1,
} from "./talentAIRuntimeContractsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";

export const TALENT_AI_GOLDEN_CASE_SCHEMA_VERSION_V1 =
  "TALENT_AI_GOLDEN_CASE_V1" as const;

export type TalentAIGoldenCaseOutcomeClassV1 =
  | "ADVISORY_VALIDATED"
  | "FAILED";

export type TalentAIGoldenCaseAssertionV1 =
  | "TENANT_SCOPE"
  | "CONTEXT_GOVERNANCE"
  | "FAIL_CLOSED"
  | "TIMEOUT"
  | "OUTPUT_CEILING"
  | "INVALID_PROVIDER_OUTPUT"
  | "OBSERVABILITY_IDENTITY";

export interface TalentAIGoldenCaseV1 {
  readonly schemaVersion:
    typeof TALENT_AI_GOLDEN_CASE_SCHEMA_VERSION_V1;
  readonly caseId: string;
  readonly description: string;
  readonly executionInput: TalentExecutionInputV1;
  readonly contextAuthority: TalentContextAuthorityV1;
  readonly expectedOutcomeClass: TalentAIGoldenCaseOutcomeClassV1;
  readonly expectedFailureCode: TalentAIRuntimeFailureCodeV1 | null;
  readonly maxProviderInvocations: 1;
  readonly deadlineMs: typeof TALENT_AI_DEADLINE_MS_V1;
  readonly maxOutputBytes: typeof TALENT_AI_MAX_OUTPUT_BYTES_V1;
  readonly assertions: readonly TalentAIGoldenCaseAssertionV1[];
}

export const TALENT_AI_REQUIRED_GOLDEN_CASE_ASSERTIONS_V1:
readonly TalentAIGoldenCaseAssertionV1[] = Object.freeze([
  "TENANT_SCOPE",
  "CONTEXT_GOVERNANCE",
  "FAIL_CLOSED",
  "TIMEOUT",
  "OUTPUT_CEILING",
  "INVALID_PROVIDER_OUTPUT",
  "OBSERVABILITY_IDENTITY",
]);

export function defineTalentAIGoldenCaseV1(
  value: TalentAIGoldenCaseV1,
): Readonly<TalentAIGoldenCaseV1> {
  if (!value.caseId.trim()) {
    throw new Error("GOLDEN_CASE_ID_REQUIRED");
  }

  if (!value.description.trim()) {
    throw new Error("GOLDEN_CASE_DESCRIPTION_REQUIRED");
  }

  if (value.maxProviderInvocations !== 1) {
    throw new Error("GOLDEN_CASE_PROVIDER_INVOCATION_LIMIT_INVALID");
  }

  if (value.deadlineMs !== TALENT_AI_DEADLINE_MS_V1) {
    throw new Error("GOLDEN_CASE_DEADLINE_INVALID");
  }

  if (value.maxOutputBytes !== TALENT_AI_MAX_OUTPUT_BYTES_V1) {
    throw new Error("GOLDEN_CASE_OUTPUT_CEILING_INVALID");
  }

  if (
    value.expectedOutcomeClass === "ADVISORY_VALIDATED" &&
    value.expectedFailureCode !== null
  ) {
    throw new Error("GOLDEN_CASE_SUCCESS_FAILURE_CODE_INVALID");
  }

  if (
    value.expectedOutcomeClass === "FAILED" &&
    value.expectedFailureCode === null
  ) {
    throw new Error("GOLDEN_CASE_FAILURE_CODE_REQUIRED");
  }

  if (value.assertions.length === 0) {
    throw new Error("GOLDEN_CASE_ASSERTION_REQUIRED");
  }

  return Object.freeze({
    ...value,
    assertions: Object.freeze([...value.assertions]),
  });
}

export function validateTalentAIGoldenCaseCoverageV1(
  cases: readonly TalentAIGoldenCaseV1[],
): void {
  if (cases.length === 0) {
    throw new Error("GOLDEN_CASE_SET_REQUIRED");
  }

  const ids = new Set<string>();

  for (const goldenCase of cases) {
    if (ids.has(goldenCase.caseId)) {
      throw new Error("GOLDEN_CASE_ID_DUPLICATE");
    }

    ids.add(goldenCase.caseId);
  }

  for (const required of TALENT_AI_REQUIRED_GOLDEN_CASE_ASSERTIONS_V1) {
    if (!cases.some((goldenCase) =>
      goldenCase.assertions.includes(required)
    )) {
      throw new Error(`GOLDEN_CASE_COVERAGE_MISSING:${required}`);
    }
  }
}