import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AuraTalentContextCompilerV1 } from "./auraTalentContextCompilerV1.js";
import {
  TALENT_CONTEXT_RULES_V1, TalentAIRuntimeErrorV1,
  type TalentAIProviderInputV1, type TalentAIRuntimeClockV1, type TalentAIRuntimeDependenciesV1,
  type TalentAIRuntimeResultV1, type TalentCompiledContextV1, type TalentContextAuthorityV1,
} from "./talentAIRuntimeContractsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import { GovernedTalentAIRuntimeV1 } from "./governedTalentAIRuntimeV1.js";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";

// Every dependency below is deterministic and in-memory. Policies are synthetic fixtures.
const authority: TalentContextAuthorityV1 = {
  scope: { environment: "preview", authenticatedConsumerId: "aura-hcm-talent-bridge-v1", hcmCompanyId: "fixture-company", auraTenantId: "fixture-tenant" },
  policyRevision: "synthetic-v1",
};
function input(): TalentExecutionInputV1 {
  return {
    environment: "preview", authenticatedConsumerId: authority.scope.authenticatedConsumerId,
    auraTenantId: authority.scope.auraTenantId,
    canonicalRequest: validateTalentRequestSchemaV1({
      protocol: "HCM_AURA_TALENT_BRIDGE_V1", requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
      correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2", hcmCompanyId: "fixture-company",
      evaluationMode: "EVALUATION", advisoryOnly: true, humanDecisionRequired: true,
      employmentActionAllowed: false, scoreBlendingAllowed: false,
      jobProfile: { jobProfileRef: "JOB_PROFILE_1", requiredSkillRefs: ["SKILL_1"], requiredCertificationRefs: ["CERTIFICATION_1"],
        promotionThreshold: { performanceScoreMin: 80, potentialScoreMin: 75, promotionReadinessMin: 80, maxDisciplinaryIncidents: 1 } },
      subjects: [{ subjectRef: "INTERNAL_1", subjectType: "INTERNAL",
        performance: { evidenceRef: "PERFORMANCE_1", performanceScore: 84, potentialScore: 80, promotionReadiness: 82,
          attendanceScore: 92, documentationScore: 80, disciplineScore: 100, tenureScore: 78, careerScore: 82,
          riskLevel: "LOW", matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL" },
        hardStops: { evidenceRef: "HARD_STOP_1", passed: true, readinessOverride: null, riskFlags: [], confidenceImpact: 0 },
        evidenceQuality: "EVIDENCE_COMPLETE" }],
    }),
  };
}
const candidate = () => ({ schemaVersion: "TALENT_AI_CANDIDATE_V1", subjectRef: "INTERNAL_1", findings: [] });
const compiler = () => new AuraTalentContextCompilerV1({ ...authority, rules: TALENT_CONTEXT_RULES_V1 }, authority);

class ManualClock implements TalentAIRuntimeClockV1 {
  elapsed = 0;
  readonly pending = new Set<{ at: number; callback: () => void }>();
  now(): number { return this.elapsed; }
  schedule(delayMs: number, callback: () => void): () => void {
    assert.ok(delayMs >= 0 && delayMs <= 5_000);
    const timer = { at: this.elapsed + delayMs, callback };
    this.pending.add(timer);
    return () => { this.pending.delete(timer); };
  }
  advance(ms: number): void {
    this.elapsed += ms;
    for (const timer of [...this.pending]) {
      if (timer.at <= this.elapsed) {
        this.pending.delete(timer);
        timer.callback();
      }
    }
  }
}
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function runtime(overrides: Partial<TalentAIRuntimeDependenciesV1> = {}) {
  return new GovernedTalentAIRuntimeV1({
    authority, contextCompiler: compiler(), provider: { generate: async () => candidate() },
    clock: new ManualClock(), ...overrides,
  });
}
function failed(result: TalentAIRuntimeResultV1, code: string): void {
  assert.equal(result.kind, "FAILED");
  if (result.kind !== "FAILED") assert.fail("Expected a fail-closed result");
  assert.equal(result.code, code);
  assert.deepEqual(Object.keys(result).sort(), ["kind", "schemaVersion", "advisoryOnly", "humanDecisionRequired", "employmentActionAllowed", "scoreBlendingAllowed", "code"].sort());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.humanDecisionRequired, true);
  assert.equal(result.employmentActionAllowed, false);
  assert.equal(result.scoreBlendingAllowed, false);
}
function frozen(value: unknown): void {
  if (typeof value === "object" && value !== null) {
    assert.equal(Object.isFrozen(value), true);
    Object.values(value).forEach(frozen);
  }
}

test("provider receives only the exact minimized immutable projection", async () => {
  const received: TalentAIProviderInputV1[] = [];
  const clock = new ManualClock();
  const source = input();
  const before = JSON.stringify(source);
  const result = await runtime({ clock, provider: { generate: async (projection) => {
    received.push(projection); frozen(projection); return candidate();
  } } }).evaluate(source);
  assert.equal(result.kind, "ADVISORY_VALIDATED"); frozen(result);
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    schemaVersion: "TALENT_AI_PROVIDER_INPUT_V1", advisoryOnly: true, humanDecisionRequired: true,
    employmentActionAllowed: false, scoreBlendingAllowed: false,
    subject: { subjectRef: "INTERNAL_1", hardStops: source.canonicalRequest.subjects[0].hardStops, evidenceQuality: "EVIDENCE_COMPLETE" },
    context: { policyRevision: "synthetic-v1", rules: [TALENT_CONTEXT_RULES_V1[0]] },
  });
  assert.doesNotMatch(JSON.stringify(received), /auraTenantId|hcmCompanyId|authenticatedConsumerId|requestId|correlationId|performanceScore|jobProfile|fixture-company|fixture-tenant/u);
  assert.equal(JSON.stringify(source), before);
  assert.equal(clock.pending.size, 0);
});

test("invalid envelopes and canonical content stop before context or adapter work", async () => {
  let calls = 0;
  const subject = input().canonicalRequest.subjects[0];
  const cases: Array<readonly [unknown, string]> = [
    [{ ...input(), unexpected: true }, "SCHEMA_VIOLATION"],
    [{ ...input(), environment: "production" }, "TENANT_MISMATCH"],
    [{ ...input(), authenticatedConsumerId: "other" }, "TENANT_MISMATCH"],
    [{ ...input(), auraTenantId: "*" }, "TENANT_MISMATCH"],
    [{ ...input(), canonicalRequest: { ...input().canonicalRequest, fullName: "forbidden" } }, "PROHIBITED_PII"],
    [{ ...input(), canonicalRequest: { ...input().canonicalRequest, scoreBlendingAllowed: true } }, "SCHEMA_VIOLATION"],
    [{ ...input(), canonicalRequest: { ...input().canonicalRequest, subjects: [{ ...subject, evidenceQuality: "EVIDENCE_INCOMPLETE" }] } }, "SCHEMA_VIOLATION"],
  ];
  const instance = runtime({
    contextCompiler: { compile: async () => { calls += 1; throw new Error("must not run"); } },
    provider: { generate: async () => { calls += 1; return candidate(); } },
  });
  for (const [value, code] of cases) failed(await instance.evaluate(value as TalentExecutionInputV1), code);
  assert.equal(calls, 0);
});

test("entry snapshots canonical input before the first asynchronous dependency", async () => {
  const source = JSON.parse(JSON.stringify(input())) as TalentExecutionInputV1;
  const compiled = deferred<TalentCompiledContextV1>();
  let snapshot: TalentExecutionInputV1 | undefined;
  const instance = runtime({ contextCompiler: { compile: async (value) => {
    snapshot = value; frozen(value); return compiled.promise;
  } } });
  const running = instance.evaluate(source);
  assert.ok(snapshot);
  (source as unknown as { auraTenantId: string }).auraTenantId = "changed";
  (source.canonicalRequest as unknown as { hcmCompanyId: string }).hcmCompanyId = "changed";
  compiled.resolve(await compiler().compile(snapshot, new AbortController().signal));
  assert.equal((await running).kind, "ADVISORY_VALIDATED");
});

test("runtime independently rejects missing context, excess context, revision and scope mismatch", async () => {
  let providerCalls = 0;
  const base = { ...authority, rules: [TALENT_CONTEXT_RULES_V1[0]] };
  for (const [context, code] of [
    [{ ...base, rules: [] }, "MISSING_GOVERNED_CONTEXT"],
    [{ ...base, rules: TALENT_CONTEXT_RULES_V1 }, "MISSING_GOVERNED_CONTEXT"],
    [{ ...base, policyRevision: "unapproved" }, "MISSING_GOVERNED_CONTEXT"],
    [{ ...base, scope: { ...base.scope, auraTenantId: "other" } }, "TENANT_MISMATCH"],
    [{ ...base, rules: [{ ...TALENT_CONTEXT_RULES_V1[0], email: "forbidden" }] }, "PROHIBITED_PII"],
  ] as const) {
    const instance = runtime({
      contextCompiler: { compile: async () => context as TalentCompiledContextV1 },
      provider: { generate: async () => { providerCalls += 1; return candidate(); } },
    });
    failed(await instance.evaluate(input()), code);
  }
  assert.equal(providerCalls, 0);
});

test("failure matrix maps errors to closed codes without exception or raw output leakage", async () => {
  const scenarios: Array<readonly [Partial<TalentAIRuntimeDependenciesV1>, string]> = [
    [{ provider: { generate: async () => { throw new Error("private-provider-detail"); } } }, "PROVIDER_UNAVAILABLE"],
    [{ provider: { generate: async () => "private-raw-response" } }, "MALFORMED_PROVIDER_OUTPUT"],
    [{ provider: { generate: async () => ({ ...candidate(), scores: 10 }) } }, "SCHEMA_VIOLATION"],
    [{ provider: { generate: async () => ({ ...candidate(), email: "private-person" }) } }, "PROHIBITED_PII"],
    [{ provider: { generate: async () => ({ ...candidate(), toolCalls: [] }) } }, "TOOL_FAILURE"],
    [{ contextCompiler: { compile: async () => { throw new Error("private-tool-detail"); } } }, "TOOL_FAILURE"],
    [{ provider: { generate: async () => { throw new TalentAIRuntimeErrorV1("INTERNAL_FAILURE"); } } }, "INTERNAL_FAILURE"],
    [{ provider: { generate: async () => { throw new TalentAIRuntimeErrorV1("invalid" as never); } } }, "INTERNAL_FAILURE"],
  ];
  for (const [dependencies, code] of scenarios) {
    const result = await runtime(dependencies).evaluate(input());
    failed(result, code);
    assert.doesNotMatch(JSON.stringify(result), /private-|advisory"|scores|toolCalls/u);
    assert.deepEqual(await runtime(dependencies).execute(input()), { kind: "FAILED" });
  }
  assert.deepEqual(await runtime().execute(input()), { kind: "EXECUTED" });
});

test("five-second total deadline aborts hung compiler and prevents late provider invocation", async () => {
  const clock = new ManualClock(); const pending = deferred<TalentCompiledContextV1>();
  let signal: AbortSignal | undefined; let calls = 0;
  const instance = runtime({ clock,
    contextCompiler: { compile: async (_input, received) => { signal = received; return pending.promise; } },
    provider: { generate: async () => { calls += 1; return candidate(); } },
  });
  const running = instance.evaluate(input());
  clock.advance(4_999); assert.equal(signal?.aborted, false);
  clock.advance(1); failed(await running, "TIMEOUT");
  assert.equal(signal?.aborted, true);
  pending.resolve({ ...authority, rules: [TALENT_CONTEXT_RULES_V1[0]] });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 0); assert.equal(clock.pending.size, 0);
});

test("provider deadline includes compiler time and discards late provider success", async () => {
  const clock = new ManualClock(); const pending = deferred<unknown>(); const entered = deferred<void>();
  let signal: AbortSignal | undefined; let calls = 0;
  const actualCompiler = compiler();
  const instance = runtime({ clock,
    contextCompiler: { compile: async (value, abort) => { clock.advance(2_000); return actualCompiler.compile(value, abort); } },
    provider: { generate: async (_projection, abort) => { calls += 1; signal = abort; entered.resolve(); return pending.promise; } },
  });
  const running = instance.evaluate(input()); await entered.promise;
  clock.advance(2_999); assert.equal(signal?.aborted, false);
  clock.advance(1); const result = await running; failed(result, "TIMEOUT");
  assert.equal(signal?.aborted, true);
  pending.resolve(candidate()); await Promise.resolve(); await Promise.resolve();
  failed(result, "TIMEOUT"); assert.equal(calls, 1); assert.equal(clock.pending.size, 0);
});

test("late provider rejection is consumed and completion at deadline cannot succeed", async () => {
  const clock = new ManualClock(); const pending = deferred<unknown>(); const entered = deferred<void>();
  const instance = runtime({ clock, provider: { generate: async () => { entered.resolve(); return pending.promise; } } });
  const running = instance.evaluate(input()); await entered.promise;
  clock.advance(5_000); failed(await running, "TIMEOUT");
  pending.reject(new Error("late-private-error")); await Promise.resolve(); await Promise.resolve();
  const secondClock = new ManualClock();
  failed(await runtime({ clock: secondClock, provider: { generate: async () => {
    secondClock.elapsed = 5_000; return candidate();
  } } }).evaluate(input()), "TIMEOUT");
});

test("no action, persistence, retry or alternate-provider capability is consulted", async () => {
  let forbiddenCalls = 0; let calls = 0;
  const dependencies = {
    authority, contextCompiler: compiler(), clock: new ManualClock(),
    provider: { generate: async () => { calls += 1; throw new Error("unavailable"); } },
    executeEmploymentAction: () => { forbiddenCalls += 1; },
    persist: () => { forbiddenCalls += 1; },
    retry: () => { forbiddenCalls += 1; },
    fallbackProvider: () => { forbiddenCalls += 1; },
  };
  failed(await new GovernedTalentAIRuntimeV1(dependencies).evaluate(input()), "PROVIDER_UNAVAILABLE");
  assert.equal(calls, 1); assert.equal(forbiddenCalls, 0);
});
