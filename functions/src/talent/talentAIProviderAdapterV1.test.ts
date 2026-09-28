import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { AuraTalentContextCompilerV1 } from "./auraTalentContextCompilerV1.js";
import { GovernedTalentAIRuntimeV1 } from "./governedTalentAIRuntimeV1.js";
import { createTalentAIProviderAdapterV1 } from "./talentAIProviderAdapterV1.js";
import {
  TALENT_AI_DEADLINE_MS_V1,
  TALENT_AI_GUARANTEES_V1,
  TALENT_AI_MAX_OUTPUT_BYTES_V1,
  TALENT_CONTEXT_RULES_V1,
  TalentAIRuntimeErrorV1,
  type TalentAIProviderAdapterV1,
  type TalentAIProviderInputV1,
  type TalentAIRuntimeClockV1,
  type TalentAIRuntimeFailureCodeV1,
  type TalentAIRuntimeResultV1,
  type TalentContextAuthorityV1,
  type TalentContextCompilerV1,
} from "./talentAIRuntimeContractsV1.js";
import type { TalentExecutionInputV1 } from "./talentExecutionBoundaryV1.js";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";

// All injected invocations and clock operations are deterministic, in-memory fakes.
const authority: TalentContextAuthorityV1 = {
  scope: {
    environment: "preview",
    authenticatedConsumerId: "aura-hcm-talent-bridge-v1",
    hcmCompanyId: "fixture-company",
    auraTenantId: "fixture-tenant",
  },
  policyRevision: "synthetic-v1",
};

function input(limited = false): TalentExecutionInputV1 {
  return {
    environment: "preview",
    authenticatedConsumerId: authority.scope.authenticatedConsumerId,
    auraTenantId: authority.scope.auraTenantId,
    canonicalRequest: validateTalentRequestSchemaV1({
      protocol: "HCM_AURA_TALENT_BRIDGE_V1",
      requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
      correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
      hcmCompanyId: "fixture-company",
      evaluationMode: "EVALUATION",
      ...TALENT_AI_GUARANTEES_V1,
      jobProfile: {
        jobProfileRef: "JOB_PROFILE_1",
        requiredSkillRefs: ["SKILL_1"],
        requiredCertificationRefs: ["CERTIFICATION_1"],
        promotionThreshold: {
          performanceScoreMin: 80, potentialScoreMin: 75,
          promotionReadinessMin: 80, maxDisciplinaryIncidents: 1,
        },
      },
      subjects: [{
        subjectRef: "INTERNAL_1",
        subjectType: "INTERNAL",
        performance: {
          evidenceRef: "PERFORMANCE_1", performanceScore: 84,
          potentialScore: 80, promotionReadiness: 82, attendanceScore: 92,
          documentationScore: 80, disciplineScore: 100, tenureScore: 78,
          careerScore: 82, riskLevel: "LOW",
          matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL",
        },
        hardStops: {
          evidenceRef: "HARD_STOP_1", passed: !limited,
          readinessOverride: limited ? "REVIEW_REQUIRED" : null,
          riskFlags: limited ? ["LOW_CONFIDENCE"] : [],
          confidenceImpact: limited ? 20 : 0,
        },
        evidenceQuality: limited ? "CONFIDENCE_INSUFFICIENT" : "EVIDENCE_COMPLETE",
      }],
    }),
  };
}

function candidate(limited = false) {
  return {
    schemaVersion: "TALENT_AI_CANDIDATE_V1",
    subjectRef: "INTERNAL_1",
    findings: limited ? [
      { code: "HARD_STOP_PRESENT", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_HARD_STOPS"] },
      { code: "EVIDENCE_LIMITATION", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_EVIDENCE_QUALITY"] },
    ] : [],
  };
}

function projection(): TalentAIProviderInputV1 {
  const subject = input().canonicalRequest.subjects[0];
  return Object.freeze({
    schemaVersion: "TALENT_AI_PROVIDER_INPUT_V1",
    ...TALENT_AI_GUARANTEES_V1,
    subject: Object.freeze({
      subjectRef: subject.subjectRef,
      hardStops: subject.hardStops,
      evidenceQuality: subject.evidenceQuality,
    }),
    context: Object.freeze({
      policyRevision: authority.policyRevision,
      rules: Object.freeze([TALENT_CONTEXT_RULES_V1[0]]),
    }),
  });
}

function compiler(): TalentContextCompilerV1 {
  return new AuraTalentContextCompilerV1({ ...authority, rules: TALENT_CONTEXT_RULES_V1 }, authority);
}

class ManualClock implements TalentAIRuntimeClockV1 {
  elapsed = 0;
  readonly pending = new Set<{ at: number; callback: () => void }>();

  now(): number { return this.elapsed; }

  schedule(delayMs: number, callback: () => void): () => void {
    assert.ok(delayMs >= 0 && delayMs <= TALENT_AI_DEADLINE_MS_V1);
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
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function runtime(
  invoke: TalentAIProviderAdapterV1["generate"],
  clock = new ManualClock(),
  contextCompiler = compiler(),
): GovernedTalentAIRuntimeV1 {
  return new GovernedTalentAIRuntimeV1({
    authority, clock, contextCompiler, provider: createTalentAIProviderAdapterV1(invoke),
  });
}

function frozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(frozen);
}

function failed(result: TalentAIRuntimeResultV1, code: TalentAIRuntimeFailureCodeV1): void {
  assert.deepEqual(result, {
    kind: "FAILED",
    schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    ...TALENT_AI_GUARANTEES_V1,
    code,
  });
  frozen(result);
}

test("forwards the exact governed input and AbortSignal with exactly one invocation", async () => {
  const governed = projection();
  const controller = new AbortController();
  const raw = candidate();
  const before = JSON.stringify(governed);
  const calls: Parameters<TalentAIProviderAdapterV1["generate"]>[] = [];
  const adapter = createTalentAIProviderAdapterV1(async (...args) => {
    calls.push(args);
    return raw;
  });

  const output: unknown = await adapter.generate(governed, controller.signal);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 2);
  assert.strictEqual(calls[0][0], governed);
  assert.strictEqual(calls[0][1], controller.signal);
  assert.strictEqual(output, raw);
  assert.equal(JSON.stringify(governed), before);
  frozen(governed);
});

test("F2 projection stays minimized and deeply immutable through the adapter", async () => {
  const source = input();
  const before = JSON.stringify(source);
  const actualCompiler = compiler();
  let compilationSignal: AbortSignal | undefined;
  let calls = 0;
  const result = await runtime(async (governed, signal) => {
    calls += 1;
    assert.strictEqual(signal, compilationSignal);
    assert.equal(signal.aborted, false);
    assert.deepEqual(governed, projection());
    frozen(governed);
    assert.equal(Reflect.set(governed, "employmentActionAllowed", true), false);
    assert.equal(Reflect.set(governed.subject.hardStops, "passed", false), false);
    assert.equal(Reflect.set(governed.context.rules, "length", 0), false);
    assert.doesNotMatch(JSON.stringify(governed),
      /auraTenantId|hcmCompanyId|authenticatedConsumerId|requestId|correlationId|performanceScore|jobProfile/u);
    return candidate();
  }, new ManualClock(), {
    compile: async (value, signal) => {
      compilationSignal = signal;
      return actualCompiler.compile(value, signal);
    },
  }).evaluate(source);

  assert.equal(result.kind, "ADVISORY_VALIDATED");
  assert.equal(calls, 1);
  assert.equal(compilationSignal?.aborted, true);
  assert.equal(JSON.stringify(source), before);
  frozen(result);
});

test("sync and async exceptions become fresh generic failures without inspecting details", async () => {
  const hostile = new Proxy({}, {
    get: () => { assert.fail("exception properties must not be read"); },
    getPrototypeOf: () => assert.fail("exception prototype must not be read"),
  });
  for (const reason of [new Error("private-fake-detail"), new TalentAIRuntimeErrorV1("TIMEOUT"), hostile]) {
    for (const asynchronous of [false, true]) {
      let calls = 0;
      const adapter = createTalentAIProviderAdapterV1(() => {
        calls += 1;
        if (asynchronous) return Promise.reject(reason);
        throw reason;
      });
      await assert.rejects(adapter.generate(projection(), new AbortController().signal), (error: unknown) => {
        assert.ok(error instanceof TalentAIRuntimeErrorV1);
        if (!(error instanceof TalentAIRuntimeErrorV1)) {
          return assert.fail("Expected a normalized provider error");
        }
        assert.notStrictEqual(error, reason);
        assert.equal(error.code, "PROVIDER_UNAVAILABLE");
        assert.equal(error.message, "PROVIDER_UNAVAILABLE");
        assert.equal(Object.hasOwn(error, "cause"), false);
        assert.deepEqual(Object.keys(error).sort(), ["code", "name"]);
        assert.doesNotMatch(error.stack ?? "", /private-fake-detail/u);
        return true;
      });
      assert.equal(calls, 1);
    }
  }
});

test("provider failure closes the F2 result without retries, fallback or lateral capabilities", async () => {
  let calls = 0;
  let capabilityReads = 0;
  const invoke = new Proxy<TalentAIProviderAdapterV1["generate"]>(async () => {
    calls += 1;
    throw new Error("private-fake-detail");
  }, {
    get: () => { capabilityReads += 1; assert.fail("no extra capability may be consulted"); },
  });
  const adapter = createTalentAIProviderAdapterV1(invoke);
  assert.deepEqual(Reflect.ownKeys(adapter), ["generate"]);
  assert.equal(Object.isFrozen(adapter), true);
  assert.equal(Reflect.set(adapter, "generate", async () => candidate()), false);
  const result = await new GovernedTalentAIRuntimeV1({
    authority, contextCompiler: compiler(), clock: new ManualClock(), provider: adapter,
  }).evaluate(input());
  failed(result, "PROVIDER_UNAVAILABLE");
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(capabilityReads, 0);
  assert.doesNotMatch(JSON.stringify(result), /private-fake-detail/u);
});

test("raw expanded output remains unknown until the existing F2 authority rejects it", async () => {
  const raw = { ...candidate(), scores: 99 };
  const before = JSON.stringify(raw);
  const adapter = createTalentAIProviderAdapterV1(async () => raw);
  const output: unknown = await adapter.generate(projection(), new AbortController().signal);
  assert.strictEqual(output, raw);
  assert.equal(JSON.stringify(raw), before);
  failed(await runtime(async () => raw).evaluate(input()), "SCHEMA_VIOLATION");
});

test("F2 rejects malformed, expanded, unsupported and tool-bearing output", async () => {
  const cases: Array<readonly [unknown, TalentAIRuntimeFailureCodeV1]> = [
    [null, "MALFORMED_PROVIDER_OUTPUT"],
    [undefined, "MALFORMED_PROVIDER_OUTPUT"],
    [JSON.stringify(candidate()), "MALFORMED_PROVIDER_OUTPUT"],
    [{ ...candidate(), subjectRef: "INTERNAL_2" }, "SCHEMA_VIOLATION"],
    [{ ...candidate(), employmentActionAllowed: true }, "SCHEMA_VIOLATION"],
    [{ ...candidate(), findings: candidate(true).findings }, "SCHEMA_VIOLATION"],
    [{ ...candidate(), email: "synthetic-forbidden-value" }, "PROHIBITED_PII"],
    [{ ...candidate(), toolCalls: [] }, "TOOL_FAILURE"],
    [{ ...candidate(), tool_calls: [] }, "TOOL_FAILURE"],
    [{ ...candidate(), tools: [] }, "TOOL_FAILURE"],
    [{ ...candidate(), function_call: {} }, "TOOL_FAILURE"],
  ];
  for (const [raw, code] of cases) {
    let calls = 0;
    failed(await runtime(async () => { calls += 1; return raw; }).evaluate(input()), code);
    assert.equal(calls, 1);
  }
});

test("the existing UTF-8 ceiling distinguishes exact-limit schema errors from oversized output", async () => {
  const overhead = Buffer.byteLength(JSON.stringify({ ...candidate(), scores: "" }), "utf8");
  for (const offset of [-1, 0, 1]) {
    const raw = { ...candidate(), scores: "x".repeat(TALENT_AI_MAX_OUTPUT_BYTES_V1 - overhead + offset) };
    assert.equal(Buffer.byteLength(JSON.stringify(raw), "utf8"), TALENT_AI_MAX_OUTPUT_BYTES_V1 + offset);
    failed(await runtime(async () => raw).evaluate(input()),
      offset > 0 ? "MALFORMED_PROVIDER_OUTPUT" : "SCHEMA_VIOLATION");
  }
});

test("multibyte output above the existing 16 KiB ceiling fails despite a smaller character count", async () => {
  const raw = { ...candidate(), scores: "\u00e9".repeat(TALENT_AI_MAX_OUTPUT_BYTES_V1 / 2) };
  const serialized = JSON.stringify(raw);
  assert.ok(serialized.length < TALENT_AI_MAX_OUTPUT_BYTES_V1);
  assert.ok(Buffer.byteLength(serialized, "utf8") > TALENT_AI_MAX_OUTPUT_BYTES_V1);
  failed(await runtime(async () => raw).evaluate(input()), "MALFORMED_PROVIDER_OUTPUT");
});

test("untrusted accessors and serialization hooks are rejected without being executed", async () => {
  let evaluated = 0;
  const accessor = Object.defineProperty(candidate(), "schemaVersion", {
    enumerable: true,
    get: () => { evaluated += 1; return "TALENT_AI_CANDIDATE_V1"; },
  });
  const hook = { ...candidate(), toJSON: () => { evaluated += 1; return candidate(); } };
  for (const raw of [accessor, hook]) {
    failed(await runtime(async () => raw).evaluate(input()), "MALFORMED_PROVIDER_OUTPUT");
  }
  assert.equal(evaluated, 0);
});

test("validated F2 output is deeply immutable and detached from mutable raw output", async () => {
  const raw = candidate(true);
  const before = JSON.stringify(raw);
  const result = await runtime(async () => raw).evaluate(input(true));
  assert.equal(result.kind, "ADVISORY_VALIDATED");
  if (result.kind !== "ADVISORY_VALIDATED") return assert.fail("Expected a validated advisory");
  frozen(result);
  assert.equal(JSON.stringify(raw), before);
  assert.notStrictEqual(result.advisory, raw);
  assert.notStrictEqual(result.advisory.findings, raw.findings);
  assert.notStrictEqual(result.advisory.findings[0].evidenceRefs, raw.findings[0].evidenceRefs);
  const validatedBefore = JSON.stringify(result);
  assert.equal(Reflect.set(result.advisory.findings[0].evidenceRefs, "0", "CHANGED"), false);
  raw.subjectRef = "CHANGED";
  raw.findings[0].evidenceRefs[0] = "CHANGED";
  raw.findings.length = 0;
  assert.equal(JSON.stringify(result), validatedBefore);
});

test("the F2 total deadline includes compilation and aborts the exact provider signal", async () => {
  const clock = new ManualClock();
  const pending = deferred<unknown>();
  const entered = deferred<void>();
  const actualCompiler = compiler();
  let compilationSignal: AbortSignal | undefined;
  let receivedSignal: AbortSignal | undefined;
  let calls = 0;
  const instance = runtime(async (_governed, signal) => {
    calls += 1;
    receivedSignal = signal;
    entered.resolve();
    return pending.promise;
  }, clock, {
    compile: async (value, signal) => {
      compilationSignal = signal;
      clock.advance(2_000);
      return actualCompiler.compile(value, signal);
    },
  });
  const running = instance.evaluate(input());
  await entered.promise;
  assert.strictEqual(receivedSignal, compilationSignal);
  clock.advance(TALENT_AI_DEADLINE_MS_V1 - 2_000 - 1);
  assert.equal(receivedSignal?.aborted, false);
  clock.advance(1);
  const result = await running;
  failed(result, "TIMEOUT");
  assert.equal(receivedSignal?.aborted, true);
  pending.resolve(candidate());
  await pending.promise;
  await Promise.resolve();
  await Promise.resolve();
  failed(result, "TIMEOUT");
  assert.equal(calls, 1);
  assert.equal(clock.pending.size, 0);
});

test("late provider rejection cannot replace the governed timeout or trigger another invocation", async () => {
  const clock = new ManualClock();
  const pending = deferred<unknown>();
  const entered = deferred<void>();
  const finished = deferred<void>();
  let calls = 0;
  const running = runtime(async () => {
    calls += 1;
    entered.resolve();
    try { return await pending.promise; }
    finally { finished.resolve(); }
  }, clock).evaluate(input());
  await entered.promise;
  clock.advance(TALENT_AI_DEADLINE_MS_V1);
  const result = await running;
  failed(result, "TIMEOUT");
  pending.reject(new Error("private-late-fake-detail"));
  await finished.promise;
  await Promise.resolve();
  await Promise.resolve();
  failed(result, "TIMEOUT");
  assert.equal(calls, 1);
  assert.equal(clock.pending.size, 0);
});

test("completion at the deadline is rejected even before the scheduled callback runs", async () => {
  const clock = new ManualClock();
  let calls = 0;
  failed(await runtime(async () => {
    calls += 1;
    clock.elapsed = TALENT_AI_DEADLINE_MS_V1;
    return candidate();
  }, clock).evaluate(input()), "TIMEOUT");
  assert.equal(calls, 1);
  assert.equal(clock.pending.size, 0);
});

test("an exhausted F2 compilation deadline prevents any provider invocation", async () => {
  const clock = new ManualClock();
  const actualCompiler = compiler();
  let calls = 0;
  failed(await runtime(async () => {
    calls += 1;
    return candidate();
  }, clock, {
    compile: async (value, signal) => {
      clock.advance(TALENT_AI_DEADLINE_MS_V1);
      return actualCompiler.compile(value, signal);
    },
  }).evaluate(input()), "TIMEOUT");
  assert.equal(calls, 0);
  assert.equal(clock.pending.size, 0);
});
