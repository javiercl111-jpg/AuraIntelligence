import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  FirestoreTalentAdvisoryReceiptStoreV1, FirestoreTalentReceiptStoreV1,
  type FirestoreReceiptClientV1, type FirestoreReceiptTransactionV1,
} from "./firestoreTalentReceiptStoreV1.js";
import {
  talentEndpointV1, type TalentEndpointDependenciesV1, type TalentEndpointRequestV1, type TalentEndpointResponseV1,
} from "./talentEndpointV1.js";
import { GovernedTalentAdvisoryDeliveryV1, type TalentAdvisoryDeliveryBoundaryV1 } from "./talentAdvisoryDeliveryV1.js";
import { GovernedTalentAIRuntimeV1 } from "./governedTalentAIRuntimeV1.js";
import { AuraTalentContextCompilerV1 } from "./auraTalentContextCompilerV1.js";
import { TALENT_CONTEXT_RULES_V1 } from "./talentAIRuntimeContractsV1.js";
import {
  TALENT_BRIDGE_AUDIENCE_V1, TALENT_BRIDGE_CONSUMER_ID_V1,
} from "./talentBridgeConstantsV1.js";
import {
  buildTalentReceiptIdentityV1, createTalentReservedReceiptV1, TALENT_RECEIPT_COLLECTION_V1,
  TALENT_RECEIPT_LEASE_MS_V1, type TalentReceiptContextV1,
} from "./talentReceiptIdempotencyV1.js";
import type { TalentAdvisoryExecutionBindingV1, TalentAdvisoryFinalizeInputV1 } from "./talentAdvisoryReceiptV1.js";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";
import { projectTalentAdvisoryResponseV1, serializeTalentAdvisoryResponseV1 } from "./talentAdvisoryResponseV1.js";

const reservationId = "4f359f13-d149-41ae-a42f-f0f69769fc10";
function fixture(mode: "complete" | "blocked" | "limited" = "complete") {
  const canonicalRequest = validateTalentRequestSchemaV1({
    protocol: "HCM_AURA_TALENT_BRIDGE_V1",
    requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
    hcmCompanyId: "synthetic-company", evaluationMode: "EVALUATION",
    advisoryOnly: true, humanDecisionRequired: true, employmentActionAllowed: false, scoreBlendingAllowed: false,
    jobProfile: {
      jobProfileRef: "JOB_PROFILE_1", requiredSkillRefs: [], requiredCertificationRefs: [],
      promotionThreshold: { performanceScoreMin: 80, potentialScoreMin: 75, promotionReadinessMin: 80, maxDisciplinaryIncidents: 1 },
    },
    subjects: [{
      subjectRef: "INTERNAL_1", subjectType: "INTERNAL",
      performance: { evidenceRef: "PERFORMANCE_1", performanceScore: 84, potentialScore: 80, promotionReadiness: 82,
        attendanceScore: 92, documentationScore: 80, disciplineScore: 100, tenureScore: 78, careerScore: 82,
        riskLevel: "LOW", matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL" },
      hardStops: { evidenceRef: "HARD_STOP_1", passed: mode === "complete",
        readinessOverride: mode === "complete" ? null : mode === "blocked" ? "NOT_READY" : "REVIEW_REQUIRED",
        riskFlags: mode === "complete" ? [] : mode === "blocked" ? ["CRITICAL_SKILL_MISSING"] : ["LOW_CONFIDENCE"],
        confidenceImpact: mode === "limited" ? 20 : 0 },
      evidenceQuality: mode === "limited" ? "CONFIDENCE_INSUFFICIENT" : "EVIDENCE_COMPLETE",
    }],
  });
  const context: TalentReceiptContextV1 = Object.freeze({
    environment: "preview", authenticatedConsumerId: "aura-hcm-talent-bridge-v1",
    auraTenantId: "synthetic-tenant", canonicalRequest,
  });
  const binding: TalentAdvisoryExecutionBindingV1 = Object.freeze({
    deliveryContractVersion: "HCM_AURA_TALENT_ADVISORY_V1",
    runtimeContractVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    policyRevision: "synthetic-policy-v1", executionProfileRevision: "synthetic-fake-v1",
  });
  const findings = mode === "complete" ? [] : [
    { code: "HARD_STOP_PRESENT", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_HARD_STOPS"] },
    ...(mode === "limited" ? [{ code: "EVIDENCE_LIMITATION", evidenceRefs: ["HARD_STOP_1"], contextRefs: ["CONTEXT_EVIDENCE_QUALITY"] }] : []),
  ];
  const runtimeResult = {
    kind: "ADVISORY_VALIDATED", schemaVersion: "TALENT_AI_RUNTIME_RESULT_V1",
    advisoryOnly: true, humanDecisionRequired: true, employmentActionAllowed: false, scoreBlendingAllowed: false,
    advisory: { schemaVersion: "TALENT_AI_CANDIDATE_V1", subjectRef: "INTERNAL_1", findings },
  };
  return { context, binding, runtimeResult };
}
function deeplyFrozen(value: unknown): void {
  if (typeof value === "object" && value !== null) {
    assert.equal(Object.isFrozen(value), true);
    Object.values(value).forEach(deeplyFrozen);
  }
}

// Storage transport and transactions are entirely in memory. No default client is constructed.
class TimestampDouble {
  constructor(private readonly milliseconds: number) {}
  toDate(): Date { return new Date(this.milliseconds); }
}
function copy(value: unknown): unknown {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof TimestampDouble) return new TimestampDouble(value.toDate().getTime());
  if (Array.isArray(value)) return value.map(copy);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  }
  return value;
}
type Write = { kind: "create" | "update"; id: string; data: Record<string, unknown> };
class MemoryReceiptClient implements FirestoreReceiptClientV1 {
  readonly documents = new Map<string, Record<string, unknown>>();
  active = false;
  repeatCallbacks = false;
  failRead = false;
  failCommitState: string | undefined;
  loseAckState: string | undefined;
  commitGate: Promise<void> | undefined;
  private tail: Promise<void> = Promise.resolve();
  constructor(readonly events: string[]) {}
  collection(path: string) {
    assert.equal(path, TALENT_RECEIPT_COLLECTION_V1);
    return { doc: (id: string) => ({ id }) };
  }
  async runTransaction<Result>(operation: (transaction: FirestoreReceiptTransactionV1) => Promise<Result>): Promise<Result> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    this.active = true;
    try {
      const attempt = async () => {
        const writes: Write[] = [];
        const transaction: FirestoreReceiptTransactionV1 = {
          get: async (reference) => {
            this.events.push("read");
            if (this.failRead) throw new Error("private-read-detail");
            const value = copy(this.documents.get(reference.id));
            return { exists: value !== undefined, data: () => copy(value) };
          },
          create: (reference, data) => { writes.push({ kind: "create", id: reference.id, data: copy(data) as Record<string, unknown> }); },
          update: (reference, data) => { writes.push({ kind: "update", id: reference.id, data: copy(data) as Record<string, unknown> }); },
        };
        return { result: await operation(transaction), writes };
      };
      if (this.repeatCallbacks) {
        await attempt(); this.events.push("callback-repeated");
      }
      const { result, writes } = await attempt();
      if (writes.some((write) => write.data.state === "FINALIZED") && this.commitGate) await this.commitGate;
      if (writes.some((write) => write.data.state === this.failCommitState)) throw new Error("private-commit-detail");
      const next = new Map(this.documents);
      for (const write of writes) {
        if (write.kind === "create") {
          assert.equal(next.has(write.id), false);
          next.set(write.id, write.data);
        } else {
          assert.equal(next.has(write.id), true);
          next.set(write.id, { ...next.get(write.id), ...write.data });
        }
      }
      this.documents.clear();
      for (const [key, value] of next) this.documents.set(key, value);
      for (const write of writes) this.events.push("commit:" + String(write.data.state));
      if (writes.some((write) => write.data.state === this.loseAckState)) {
        this.loseAckState = undefined;
        throw new Error("private-lost-ack");
      }
      return result;
    } finally {
      this.active = false; release();
    }
  }
}
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
class MemoryResponse implements TalentEndpointResponseV1 {
  statusCode = 0;
  body = "";
  readonly headers = new Map<string, string>();
  constructor(private readonly events: string[]) {}
  setHeader(name: string, value: string): void { this.headers.set(name.toLowerCase(), value); }
  end(body: string): void { this.events.push("http:" + this.statusCode); this.body = body; }
}
function post(body: unknown = fixture().context.canonicalRequest): TalentEndpointRequestV1 {
  return { method: "POST", rawHeaders: ["Authorization", "Bearer fixture-token", "Content-Type", "application/json"],
    rawBody: Buffer.from(JSON.stringify(body), "utf8") };
}
function harness() {
  const data = fixture();
  const events: string[] = [];
  const client = new MemoryReceiptClient(events);
  let now = 1_000;
  let factories = 0;
  let evaluations = 0;
  let generations = 0;
  let legacyCalls = 0;
  let candidate: unknown = data.runtimeResult.advisory;
  let runtimeOverride: unknown;
  let overrideRuntime = false;
  let generationGate: Promise<void> | undefined;
  let selectedBinding = data.binding;
  const store = new FirestoreTalentAdvisoryReceiptStoreV1(client, () => new Date(now), () => reservationId);
  const delivery = () => new GovernedTalentAdvisoryDeliveryV1({
    store, now: () => now,
    profile: {
      executionBinding: selectedBinding,
      createEvaluator: (input, binding) => {
        assert.equal(client.active, false);
        factories += 1; events.push("evaluatorFactory");
        const authority = {
          scope: { environment: data.context.environment, authenticatedConsumerId: input.authenticatedConsumerId,
            hcmCompanyId: input.canonicalRequest.hcmCompanyId, auraTenantId: input.auraTenantId },
          policyRevision: binding.policyRevision,
        };
        const runtime = new GovernedTalentAIRuntimeV1({
          authority, contextCompiler: new AuraTalentContextCompilerV1({ ...authority, rules: TALENT_CONTEXT_RULES_V1 }, authority),
          clock: { now: () => 0, schedule: () => () => undefined },
          provider: { generate: async () => {
            assert.equal(client.active, false); generations += 1; events.push("fakeAdapter");
            if (generationGate) await generationGate;
            return candidate;
          } },
        });
        return { evaluate: async (value) => {
          assert.equal(client.active, false); evaluations += 1;
          return overrideRuntime ? runtimeOverride : runtime.evaluate(value);
        } };
      },
    },
  });
  const dependencies: TalentEndpointDependenciesV1 = {
    readCredentialSet: () => { events.push("credential"); return { primary: "fixture-token" }; },
    readAuthenticatedPrincipal: () => { events.push("principal"); return { consumerId: TALENT_BRIDGE_CONSUMER_ID_V1, audience: TALENT_BRIDGE_AUDIENCE_V1 }; },
    readProjectId: () => { events.push("project"); return "aura-intel-preview"; },
    createTenantRegistry: () => {
      events.push("registryFactory");
      return { readAuthoritySnapshot: async (input) => {
        events.push("registryRead");
        const mapping = { ...input, mappingId: "synthetic-mapping", auraTenantId: data.context.auraTenantId, status: "ACTIVE" };
        return { forward: [mapping], reverse: [mapping] };
      } };
    },
    createReceiptStore: () => { legacyCalls += 1; throw new Error("Legacy store must not be used."); },
    createExecutionBoundary: () => { legacyCalls += 1; throw new Error("Legacy execution must not be used."); },
    createAdvisoryDeliveryBoundary: () => { events.push("deliveryFactory"); return delivery(); },
  };
  const invoke = async (request = post(), overrides: Partial<TalentEndpointDependenciesV1> = {}) => {
    const response = new MemoryResponse(events);
    await talentEndpointV1(request, response, { ...dependencies, ...overrides });
    return response;
  };
  return { ...data, client, store, dependencies, invoke, events,
    documentId: buildTalentReceiptIdentityV1(data.context).documentId,
    counts: () => ({ factories, evaluations, generations, legacyCalls }),
    setNow: (value: number) => { now = value; },
    useBinding: (value: TalentAdvisoryExecutionBindingV1) => { selectedBinding = value; },
    useCandidate: (value: unknown) => { candidate = value; },
    useRuntime: (value: unknown) => { overrideRuntime = true; runtimeOverride = value; },
    holdGeneration: (gate: Promise<void>) => { generationGate = gate; },
  };
}
function assertError(response: MemoryResponse, code: string, status = 503): void {
  assert.equal(response.statusCode, status);
  const body = JSON.parse(response.body) as { error: { code: string } };
  assert.equal(body.error.code, code);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(response.body, /private-|synthetic-tenant|synthetic-company|terminalBody|findings|ADVISORY_VALIDATED/u);
}
function finalizeInput(data: ReturnType<typeof fixture>): TalentAdvisoryFinalizeInputV1 {
  return {
    context: data.context, executionBinding: data.binding, reservationId,
    terminalHttpStatus: 200, terminalOutcomeCode: "ADVISORY_DELIVERED",
    terminalBody: serializeTalentAdvisoryResponseV1(
      projectTalentAdvisoryResponseV1(data.runtimeResult, data.context.canonicalRequest), data.context.canonicalRequest,
    ),
  };
}

test("optional delivery produces 200 only after committed advisory and exact replay executes nothing", async () => {
  const state = harness();
  const first = await state.invoke();
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers.get("content-type"), "application/json");
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.ok(state.events.indexOf("deliveryFactory") > state.events.indexOf("registryRead"));
  assert.ok(state.events.indexOf("evaluatorFactory") > state.events.indexOf("commit:RESERVED"));
  assert.ok(state.events.indexOf("http:200") > state.events.indexOf("commit:FINALIZED"));
  const stored = state.client.documents.get(state.documentId); assert.ok(stored);
  assert.equal(stored.terminalBody, first.body);
  assert.equal(stored.terminalHttpStatus, 200);
  assert.equal(stored.terminalOutcomeCode, "ADVISORY_DELIVERED");
  assert.equal("advisory" in stored, false);
  assert.ok(stored.expiresAt instanceof Date);
  for (const key of ["createdAt", "updatedAt", "leaseExpiresAt", "expiresAt"]) {
    assert.ok(stored[key] instanceof Date);
    stored[key] = new TimestampDouble((stored[key] as Date).getTime());
  }
  const replay = await state.invoke();
  assert.equal(replay.statusCode, 200); assert.equal(replay.body, first.body);
  assert.deepEqual(state.counts(), { factories: 1, evaluations: 1, generations: 1, legacyCalls: 0 });
});

test("legacy execution and failure finalization remain unchanged without injection", async () => {
  const state = harness(); let executions = 0;
  const legacy = new FirestoreTalentReceiptStoreV1(state.client, () => new Date(1_000), () => reservationId);
  const overrides: Partial<TalentEndpointDependenciesV1> = {
    createAdvisoryDeliveryBoundary: undefined,
    createReceiptStore: () => legacy,
    createExecutionBoundary: () => ({ execute: async () => { executions += 1; return { kind: "EXECUTED" }; } }),
  };
  assertError(await state.invoke(post(), overrides), "INTERNAL_FAILURE");
  assertError(await state.invoke(post(), overrides), "INTERNAL_FAILURE");
  assert.equal(executions, 1);
  const stored = state.client.documents.get(state.documentId); assert.ok(stored);
  assert.equal(stored.terminalHttpStatus, 503);
  assert.equal("advisoryReceiptVersion" in stored, false);
  assert.equal("terminalBody" in stored, false);
  assert.equal(state.counts().evaluations, 0);
});

test("authentication, body, environment and tenant rejections precede delivery construction", async () => {
  const cases: Array<readonly [TalentEndpointRequestV1, string, number, Partial<TalentEndpointDependenciesV1>]> = [
    [{ ...post(), method: "GET" }, "METHOD_NOT_ALLOWED", 405, {}],
    [{ ...post(), rawHeaders: [] }, "AUTHENTICATION_FAILED", 401, {}],
    [post({ fullName: "forbidden" }), "PROHIBITED_PII", 400, {}],
    [post({ ...fixture().context.canonicalRequest, scoreBlendingAllowed: true }), "SCHEMA_VIOLATION", 400, {}],
    [post(), "INTERNAL_FAILURE", 503, { readProjectId: () => "unknown-project" }],
    [post(), "TENANT_MISMATCH", 403, { createTenantRegistry: () => ({ readAuthoritySnapshot: async () => ({ forward: [], reverse: [] }) }) }],
  ];
  for (const [request, code, status, overrides] of cases) {
    const state = harness(); assertError(await state.invoke(request, overrides), code, status);
    assert.equal(state.events.includes("deliveryFactory"), false);
    assert.equal(state.client.documents.size, 0); assert.equal(state.counts().evaluations, 0);
  }
});

test("delivery factory and invalid result failures cannot fall back or expose arbitrary codes", async () => {
  for (const output of [null, {}, { kind: "EXECUTED" }, { kind: "FAILED", code: "PROHIBITED_PII" },
    { kind: "FAILED", code: "INTERNAL_FAILURE", detail: "private-detail" },
    { kind: "DELIVERED", terminalBody: "{}" }]) {
    const state = harness();
    const boundary = { deliver: async () => output } as unknown as TalentAdvisoryDeliveryBoundaryV1;
    assertError(await state.invoke(post(), { createAdvisoryDeliveryBoundary: () => boundary }), "INTERNAL_FAILURE");
    assert.equal(state.counts().legacyCalls, 0);
  }
  const state = harness();
  assertError(await state.invoke(post(), { createAdvisoryDeliveryBoundary: () => { throw new Error("private-factory"); } }), "INTERNAL_FAILURE");
  assert.equal(state.counts().legacyCalls, 0);
});

test("endpoint independently rejects noncanonical or request-mismatched success bodies", async () => {
  const data = fixture(); const valid = finalizeInput(data).terminalBody;
  for (const body of [valid + " ", valid.replace(data.context.canonicalRequest.requestId, reservationId),
    valid.replace('"employmentActionAllowed":false', '"employmentActionAllowed":true')]) {
    const state = harness();
    assertError(await state.invoke(post(), { createAdvisoryDeliveryBoundary: () => ({
      deliver: async () => ({ kind: "DELIVERED", terminalBody: body }),
    }) }), "INTERNAL_FAILURE");
    assert.equal(state.counts().legacyCalls, 0);
  }
});

test("fingerprint conflict and live reservation return certified idempotency errors", async () => {
  const state = harness();
  await state.store.reserve({ context: state.context, executionBinding: state.binding });
  assertError(await state.invoke(), "IDEMPOTENCY_IN_PROGRESS", 409);
  const changed = { ...state.context.canonicalRequest, correlationId: reservationId };
  assertError(await state.invoke(post(changed)), "IDEMPOTENCY_CONFLICT", 409);
  assert.equal(state.counts().evaluations, 0);
  assert.equal(state.client.documents.get(state.documentId)?.state, "RESERVED");
});

test("concurrent duplicate cannot evaluate while the owner is pending", async () => {
  const state = harness(); const gate = deferred<void>();
  state.holdGeneration(gate.promise);
  const owner = state.invoke();
  for (let turn = 0; turn < 40 && state.counts().generations === 0; turn += 1) await Promise.resolve();
  assert.equal(state.counts().generations, 1);
  assertError(await state.invoke(), "IDEMPOTENCY_IN_PROGRESS", 409);
  gate.resolve();
  assert.equal((await owner).statusCode, 200);
  assert.equal(state.counts().generations, 1);
});

test("expired advisory and legacy reservations atomically become unknown without takeover", async () => {
  for (const legacy of [false, true]) {
    const state = harness();
    if (legacy) {
      state.client.documents.set(state.documentId, { ...createTalentReservedReceiptV1(state.context, new Date(1_000), reservationId) });
    } else {
      await state.store.reserve({ context: state.context, executionBinding: state.binding });
    }
    state.setNow(1_000 + TALENT_RECEIPT_LEASE_MS_V1);
    assertError(await state.invoke(), "OUTCOME_UNKNOWN");
    assert.equal(state.client.documents.get(state.documentId)?.state, "OUTCOME_UNKNOWN");
    assertError(await state.invoke(), "OUTCOME_UNKNOWN");
    assert.equal(state.counts().evaluations, 0);
    assert.equal(state.events.filter((event) => event === "commit:OUTCOME_UNKNOWN").length, 1);
  }
});

test("legacy finalized failure cannot be upgraded and legacy readers reject advisory receipts", async () => {
  const state = harness();
  const legacy = createTalentReservedReceiptV1(state.context, new Date(1_000), reservationId);
  state.client.documents.set(state.documentId, { ...legacy, state: "FINALIZED", terminalHttpStatus: 503, terminalOutcomeCode: "INTERNAL_FAILURE" });
  assertError(await state.invoke(), "INTERNAL_FAILURE");
  assert.equal(state.counts().evaluations, 0);
  assert.equal("terminalBody" in (state.client.documents.get(state.documentId) ?? {}), false);
  const advisory = harness(); await advisory.invoke();
  const oldStore = new FirestoreTalentReceiptStoreV1(advisory.client, () => new Date(1_000), () => reservationId);
  await assert.rejects(oldStore.reserve(advisory.context));
  assert.equal(advisory.client.documents.get(advisory.documentId)?.terminalHttpStatus, 200);
});

test("policy, execution profile, format and tenant mismatches cannot overwrite or reevaluate", async () => {
  for (const key of ["policyRevision", "executionProfileRevision"] as const) {
    const state = harness(); const first = await state.invoke();
    state.useBinding({ ...state.binding, [key]: "different-v2" });
    assertError(await state.invoke(), "INTERNAL_FAILURE");
    assert.equal(state.client.documents.get(state.documentId)?.terminalBody, first.body);
    assert.equal(state.counts().evaluations, 1);
  }
  for (const [key, value, expected, status] of [
    ["advisoryReceiptVersion", "v2", "INTERNAL_FAILURE", 503],
    ["auraTenantId", "other-tenant", "IDEMPOTENCY_CONFLICT", 409],
  ] as const) {
    const state = harness(); await state.invoke();
    const stored = state.client.documents.get(state.documentId); assert.ok(stored);
    stored[key] = value;
    const before = JSON.stringify(stored);
    assertError(await state.invoke(), expected, status);
    assert.equal(JSON.stringify(state.client.documents.get(state.documentId)), before);
    assert.equal(state.counts().evaluations, 1);
  }
});

test("corrupt replay and malformed runtime output never become successful HTTP responses", async () => {
  const replay = harness(); await replay.invoke();
  const stored = replay.client.documents.get(replay.documentId); assert.ok(stored);
  stored.terminalBody = String(stored.terminalBody) + " ";
  assertError(await replay.invoke(), "INTERNAL_FAILURE");
  assert.equal(replay.counts().evaluations, 1);
  for (const result of [undefined, { kind: "EXECUTED" }, { kind: "FAILED", code: "PRIVATE" },
    { ...fixture().runtimeResult, advisory: null }]) {
    const state = harness(); state.useRuntime(result);
    assertError(await state.invoke(), "INTERNAL_FAILURE");
    assert.equal(state.client.documents.get(state.documentId)?.state, "RESERVED");
    assert.equal(state.events.includes("commit:FINALIZED"), false);
  }
});

test("read and finalization commit failures return no advisory or success", async () => {
  const read = harness(); read.client.failRead = true;
  assertError(await read.invoke(), "INTERNAL_FAILURE");
  assert.equal(read.counts().evaluations, 0); assert.equal(read.client.documents.size, 0);
  const commit = harness(); commit.client.failCommitState = "FINALIZED";
  assertError(await commit.invoke(), "INTERNAL_FAILURE");
  assert.equal(commit.client.documents.get(commit.documentId)?.state, "RESERVED");
  assert.equal(commit.events.includes("http:200"), false);
  assert.equal(commit.counts().evaluations, 1);
});

test("committed advisory with lost acknowledgment is recovered only on subsequent replay", async () => {
  const state = harness(); state.client.loseAckState = "FINALIZED";
  assertError(await state.invoke(), "INTERNAL_FAILURE");
  const stored = state.client.documents.get(state.documentId); assert.ok(stored);
  assert.equal(stored.state, "FINALIZED");
  const replay = await state.invoke();
  assert.equal(replay.statusCode, 200); assert.equal(replay.body, stored.terminalBody);
  assert.equal(state.counts().evaluations, 1);
});

test("HTTP success waits for transaction commit and transaction callback repeats cannot repeat execution", async () => {
  const state = harness(); const gate = deferred<void>();
  state.client.repeatCallbacks = true;
  state.client.commitGate = gate.promise;
  let settled = false;
  const pending = state.invoke().then((response) => { settled = true; return response; });
  for (let turn = 0; turn < 60; turn += 1) await Promise.resolve();
  assert.equal(state.counts().evaluations, 1);
  assert.equal(state.events.includes("commit:FINALIZED"), false);
  assert.equal(settled, false);
  gate.resolve();
  assert.equal((await pending).statusCode, 200);
  assert.equal(state.counts().evaluations, 1);
  assert.equal(state.counts().generations, 1);
  assert.ok(state.events.filter((event) => event === "callback-repeated").length >= 2);
});

test("finalization independently checks owner, binding, fingerprint and live lease", async () => {
  for (const change of [
    (input: TalentAdvisoryFinalizeInputV1) => ({ ...input, reservationId: input.context.canonicalRequest.requestId }),
    (input: TalentAdvisoryFinalizeInputV1) => ({ ...input, executionBinding: { ...input.executionBinding, policyRevision: "other" } }),
    (input: TalentAdvisoryFinalizeInputV1) => ({ ...input, context: { ...input.context, auraTenantId: "other" } }),
    (input: TalentAdvisoryFinalizeInputV1) => ({ ...input, terminalBody: "{}" }),
  ]) {
    const state = harness(); await state.store.reserve({ context: state.context, executionBinding: state.binding });
    await assert.rejects(state.store.finalize(change(finalizeInput(state))));
    assert.equal(state.client.documents.get(state.documentId)?.state, "RESERVED");
    assert.equal(state.events.includes("commit:FINALIZED"), false);
  }
  const expired = harness(); await expired.store.reserve({ context: expired.context, executionBinding: expired.binding });
  expired.setNow(1_000 + TALENT_RECEIPT_LEASE_MS_V1);
  await assert.rejects(expired.store.finalize(finalizeInput(expired)));
  assert.equal(expired.client.documents.get(expired.documentId)?.state, "OUTCOME_UNKNOWN");
  assert.equal(expired.events.includes("commit:OUTCOME_UNKNOWN"), true);
});

test("storage timestamps retain Date fields for TTL and immutable numeric boundary receipts", async () => {
  const state = harness();
  const decision = await state.store.reserve({ context: state.context, executionBinding: state.binding });
  assert.equal(decision.kind, "RESERVED_OWNER");
  if (decision.kind !== "RESERVED_OWNER") assert.fail("Expected owner");
  assert.equal(typeof decision.receipt.expiresAt, "number"); deeplyFrozen(decision);
  const raw = state.client.documents.get(state.documentId); assert.ok(raw);
  assert.ok(raw.expiresAt instanceof Date);
  const corrupt = { ...raw, expiresAt: new Date(Number.NaN) };
  state.client.documents.set(state.documentId, corrupt);
  assertError(await state.invoke(), "INTERNAL_FAILURE");
  assert.equal(state.counts().evaluations, 0);
});

