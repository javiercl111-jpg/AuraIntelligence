import { TALENT_BRIDGE_CONSUMER_ID_V1 } from "./talentBridgeConstantsV1.js";
import {
  exactTalentAIRecordV1,
  snapshotTalentAIJsonV1,
  TALENT_CONTEXT_RULES_V1,
  TalentAIRuntimeErrorV1,
  type GovernedContextRuleV1,
  type TalentCompiledContextV1,
  type TalentContextAuthorityV1,
  type TalentContextCompilerV1,
  type TalentContextScopeV1,
  type TalentGovernedPolicyPackV1,
} from "./talentAIRuntimeContractsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import { enforceTalentPiiGovernanceV1 } from "./talentPiiGovernanceV1.js";

export function validateTalentContextScopeV1(value: unknown): TalentContextScopeV1 {
  const record = exactTalentAIRecordV1(value, [
    "environment", "authenticatedConsumerId", "hcmCompanyId", "auraTenantId",
  ], "TENANT_MISMATCH");
  const identifier = (item: unknown): item is string => typeof item === "string" &&
    item.length > 0 && item.trim() === item && !item.includes("*") &&
    item.toLowerCase() !== "default" && !/[\u0000-\u001f\u007f]/u.test(item);
  if ((record.environment !== "preview" && record.environment !== "staging") ||
      record.authenticatedConsumerId !== TALENT_BRIDGE_CONSUMER_ID_V1 ||
      !identifier(record.hcmCompanyId) || !identifier(record.auraTenantId)) {
    throw new TalentAIRuntimeErrorV1("TENANT_MISMATCH");
  }
  return Object.freeze({
    environment: record.environment,
    authenticatedConsumerId: record.authenticatedConsumerId,
    hcmCompanyId: record.hcmCompanyId,
    auraTenantId: record.auraTenantId,
  });
}

export function snapshotTalentContextAuthorityV1(value: TalentContextAuthorityV1): TalentContextAuthorityV1 {
  const record = exactTalentAIRecordV1(snapshotTalentAIJsonV1(
    value, 16_384, "MISSING_GOVERNED_CONTEXT",
  ), ["scope", "policyRevision"], "MISSING_GOVERNED_CONTEXT");
  if (typeof record.policyRevision !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(record.policyRevision)) {
    throw new TalentAIRuntimeErrorV1("MISSING_GOVERNED_CONTEXT");
  }
  return Object.freeze({
    scope: validateTalentContextScopeV1(record.scope),
    policyRevision: record.policyRevision,
  });
}

export function requireTalentContextScopeV1(
  actual: TalentContextScopeV1, expected: TalentContextScopeV1,
): void {
  if (actual.environment !== expected.environment ||
      actual.authenticatedConsumerId !== expected.authenticatedConsumerId ||
      actual.hcmCompanyId !== expected.hcmCompanyId ||
      actual.auraTenantId !== expected.auraTenantId) {
    throw new TalentAIRuntimeErrorV1("TENANT_MISMATCH");
  }
}

export function requiredTalentContextRulesV1(input: TalentExecutionInputV1): readonly GovernedContextRuleV1[] {
  const subject = input.canonicalRequest.subjects[0];
  return Object.freeze(TALENT_CONTEXT_RULES_V1.filter((rule) =>
    rule.ref === "CONTEXT_GUARDRAILS" ||
    (rule.ref === "CONTEXT_HARD_STOPS" && !subject.hardStops.passed) ||
    (rule.ref === "CONTEXT_EVIDENCE_QUALITY" && subject.evidenceQuality !== "EVIDENCE_COMPLETE"),
  ));
}

/** Used independently by the runtime as well as by the compiler. */
export function validateTalentCompiledContextV1(
  value: unknown,
  input: TalentExecutionInputV1,
  authority: TalentContextAuthorityV1,
  allowUnusedRules = false,
): TalentCompiledContextV1 {
  const pack = exactTalentAIRecordV1(snapshotTalentAIJsonV1(
    value, 16_384, "MISSING_GOVERNED_CONTEXT",
  ), ["scope", "policyRevision", "rules"], "MISSING_GOVERNED_CONTEXT");
  const scope = validateTalentContextScopeV1(pack.scope);
  const inputScope = validateTalentContextScopeV1({
    environment: input.environment,
    authenticatedConsumerId: input.authenticatedConsumerId,
    hcmCompanyId: input.canonicalRequest.hcmCompanyId,
    auraTenantId: input.auraTenantId,
  });
  requireTalentContextScopeV1(inputScope, authority.scope);
  requireTalentContextScopeV1(scope, authority.scope);
  if (pack.policyRevision !== authority.policyRevision || !Array.isArray(pack.rules) ||
      pack.rules.length < 1 || pack.rules.length > 3) {
    throw new TalentAIRuntimeErrorV1("MISSING_GOVERNED_CONTEXT");
  }
  enforceTalentPiiGovernanceV1({ rules: pack.rules });
  let previousIndex = -1;
  const rules = pack.rules.map((value: unknown) => {
    const rule = exactTalentAIRecordV1(value, ["ref", "code"], "MISSING_GOVERNED_CONTEXT");
    const index = TALENT_CONTEXT_RULES_V1.findIndex((allowed) =>
      allowed.ref === rule.ref && allowed.code === rule.code,
    );
    if (index < 0 || index <= previousIndex) {
      throw new TalentAIRuntimeErrorV1("MISSING_GOVERNED_CONTEXT");
    }
    previousIndex = index;
    return TALENT_CONTEXT_RULES_V1[index];
  });
  const required = requiredTalentContextRulesV1(input);
  if ((!allowUnusedRules && rules.length !== required.length) ||
      !required.every((rule) => rules.some((item) => item.ref === rule.ref))) {
    throw new TalentAIRuntimeErrorV1("MISSING_GOVERNED_CONTEXT");
  }
  return Object.freeze({ scope, policyRevision: authority.policyRevision, rules: required });
}

export class AuraTalentContextCompilerV1 implements TalentContextCompilerV1 {
  private readonly pack: unknown;
  private readonly authority: TalentContextAuthorityV1;

  constructor(pack: TalentGovernedPolicyPackV1, authority: TalentContextAuthorityV1) {
    // Defensive copies prevent the caller from changing policy after injection.
    this.pack = snapshotTalentAIJsonV1(pack, 16_384, "MISSING_GOVERNED_CONTEXT");
    this.authority = snapshotTalentContextAuthorityV1(authority);
  }

  async compile(input: TalentExecutionInputV1, signal: AbortSignal): Promise<TalentCompiledContextV1> {
    if (signal.aborted) throw new TalentAIRuntimeErrorV1("TIMEOUT");
    return validateTalentCompiledContextV1(this.pack, input, this.authority, true);
  }
}
