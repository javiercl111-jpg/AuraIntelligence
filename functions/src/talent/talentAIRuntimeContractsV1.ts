import { Buffer } from "node:buffer";
import type { TalentBridgeEnvironmentV1 } from "./talentBridgeConstantsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import type { TalentEvidenceQualityV1, TalentHardStopsV1 } from "./talentRequestSchemaV1.js";

export const TALENT_AI_DEADLINE_MS_V1 = 5_000;
export const TALENT_AI_MAX_OUTPUT_BYTES_V1 = 16 * 1_024;

export const TALENT_AI_GUARANTEES_V1 = Object.freeze({
  advisoryOnly: true,
  humanDecisionRequired: true,
  employmentActionAllowed: false,
  scoreBlendingAllowed: false,
} as const);

export const TALENT_AI_FAILURE_CODES_V1 = Object.freeze([
  "PROVIDER_UNAVAILABLE", "TIMEOUT", "MALFORMED_PROVIDER_OUTPUT",
  "SCHEMA_VIOLATION", "MISSING_GOVERNED_CONTEXT", "TENANT_MISMATCH",
  "PROHIBITED_PII", "TOOL_FAILURE", "INTERNAL_FAILURE",
] as const);
export type TalentAIRuntimeFailureCodeV1 = typeof TALENT_AI_FAILURE_CODES_V1[number];

export class TalentAIRuntimeErrorV1 extends Error {
  constructor(readonly code: TalentAIRuntimeFailureCodeV1) {
    super(code);
    this.name = "TalentAIRuntimeErrorV1";
  }
}

export interface TalentContextScopeV1 {
  readonly environment: TalentBridgeEnvironmentV1;
  readonly authenticatedConsumerId: string;
  readonly hcmCompanyId: string;
  readonly auraTenantId: string;
}

export interface TalentContextAuthorityV1 {
  readonly scope: TalentContextScopeV1;
  readonly policyRevision: string;
}

export type GovernedContextRuleV1 =
  | Readonly<{ ref: "CONTEXT_GUARDRAILS"; code: "ADVISORY_HUMAN_ONLY_NO_ACTION_NO_BLEND" }>
  | Readonly<{ ref: "CONTEXT_HARD_STOPS"; code: "PRESERVE_CANONICAL_HARD_STOPS" }>
  | Readonly<{ ref: "CONTEXT_EVIDENCE_QUALITY"; code: "PRESERVE_CANONICAL_EVIDENCE_QUALITY" }>;

export const TALENT_CONTEXT_RULES_V1: readonly GovernedContextRuleV1[] = Object.freeze([
  Object.freeze({ ref: "CONTEXT_GUARDRAILS", code: "ADVISORY_HUMAN_ONLY_NO_ACTION_NO_BLEND" } as const),
  Object.freeze({ ref: "CONTEXT_HARD_STOPS", code: "PRESERVE_CANONICAL_HARD_STOPS" } as const),
  Object.freeze({ ref: "CONTEXT_EVIDENCE_QUALITY", code: "PRESERVE_CANONICAL_EVIDENCE_QUALITY" } as const),
]);

export interface TalentGovernedPolicyPackV1 extends TalentContextAuthorityV1 {
  readonly rules: readonly GovernedContextRuleV1[];
}
export type TalentCompiledContextV1 = TalentGovernedPolicyPackV1;

export interface TalentContextCompilerV1 {
  compile(input: TalentExecutionInputV1, signal: AbortSignal): Promise<TalentCompiledContextV1>;
}

export interface TalentAIProviderInputV1 {
  readonly schemaVersion: "TALENT_AI_PROVIDER_INPUT_V1";
  readonly advisoryOnly: true;
  readonly humanDecisionRequired: true;
  readonly employmentActionAllowed: false;
  readonly scoreBlendingAllowed: false;
  readonly subject: Readonly<{
    subjectRef: "INTERNAL_1";
    hardStops: TalentHardStopsV1;
    evidenceQuality: TalentEvidenceQualityV1;
  }>;
  readonly context: Readonly<{
    policyRevision: string;
    rules: readonly GovernedContextRuleV1[];
  }>;
}

export interface TalentAIProviderAdapterV1 {
  generate(input: TalentAIProviderInputV1, signal: AbortSignal): Promise<unknown>;
}

export type TalentAIFindingV1 =
  | Readonly<{
      code: "HARD_STOP_PRESENT";
      evidenceRefs: readonly ["HARD_STOP_1"];
      contextRefs: readonly ["CONTEXT_HARD_STOPS"];
    }>
  | Readonly<{
      code: "EVIDENCE_LIMITATION";
      evidenceRefs: readonly ["HARD_STOP_1"];
      contextRefs: readonly ["CONTEXT_EVIDENCE_QUALITY"];
    }>;

export interface ValidatedTalentAICandidateV1 {
  readonly schemaVersion: "TALENT_AI_CANDIDATE_V1";
  readonly subjectRef: "INTERNAL_1";
  readonly findings: readonly TalentAIFindingV1[];
}

type RuntimeEnvelopeV1 = Readonly<{
  schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1";
}> & typeof TALENT_AI_GUARANTEES_V1;

export type TalentAIRuntimeResultV1 = RuntimeEnvelopeV1 & (
  | Readonly<{ kind: "ADVISORY_VALIDATED"; advisory: ValidatedTalentAICandidateV1 }>
  | Readonly<{ kind: "FAILED"; code: TalentAIRuntimeFailureCodeV1 }>
);

/** Trusted, deployment-owned monotonic clock; schedule returns a cancellation function. */
export interface TalentAIRuntimeClockV1 {
  now(): number;
  schedule(delayMs: number, callback: () => void): () => void;
}

export interface TalentAIRuntimeDependenciesV1 {
  readonly provider: TalentAIProviderAdapterV1;
  readonly contextCompiler: TalentContextCompilerV1;
  readonly authority: TalentContextAuthorityV1;
  readonly clock?: TalentAIRuntimeClockV1;
}

export function exactTalentAIRecordV1(
  value: unknown,
  keys: readonly string[],
  code: TalentAIRuntimeFailureCodeV1 = "SCHEMA_VIOLATION",
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== keys.length ||
      !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    throw new TalentAIRuntimeErrorV1(code);
  }
  return value as Record<string, unknown>;
}

/** Copy JSON data without invoking accessors/toJSON; bound depth, nodes and UTF-8 bytes. */
export function snapshotTalentAIJsonV1(
  value: unknown,
  maxBytes: number,
  code: TalentAIRuntimeFailureCodeV1,
): unknown {
  let bytes = 0;
  let nodes = 0;
  const ancestors = new Set<object>();
  const reject = (): never => { throw new TalentAIRuntimeErrorV1(code); };
  const count = (text: string): void => {
    bytes += Buffer.byteLength(text, "utf8");
    if (bytes > maxBytes) reject();
  };
  const visit = (item: unknown, depth: number): unknown => {
    if (++nodes > 2_048 || depth > 10) return reject();
    if (item === null || typeof item === "boolean" ||
        (typeof item === "number" && Number.isFinite(item))) {
      count(JSON.stringify(item));
      return item;
    }
    if (typeof item === "string") {
      if (item.length > maxBytes) return reject();
      count(JSON.stringify(item));
      return item;
    }
    if (typeof item !== "object" || ancestors.has(item)) return reject();
    const array = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype :
        prototype !== Object.prototype && prototype !== null) return reject();
    const keys = Reflect.ownKeys(item);
    if (keys.length > 2_048 || keys.some((key) => typeof key !== "string")) return reject();
    ancestors.add(item);
    count(array ? "[]" : "{}");
    if (array) {
      if (item.length > 2_048 || keys.length !== item.length + 1) return reject();
      const result: unknown[] = [];
      for (let index = 0; index < item.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return reject();
        if (index > 0) count(",");
        result.push(visit(descriptor.value, depth + 1));
      }
      ancestors.delete(item);
      return Object.freeze(result);
    }
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    let index = 0;
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return reject();
      if (key.length > maxBytes) return reject();
      if (index++ > 0) count(",");
      count(JSON.stringify(key));
      count(":");
      result[key] = visit(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
    return Object.freeze(result);
  };
  return visit(value, 0);
}
