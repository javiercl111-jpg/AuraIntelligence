import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AuraTalentContextCompilerV1 } from "./auraTalentContextCompilerV1.js";
import { TALENT_CONTEXT_RULES_V1, type TalentContextAuthorityV1 } from "./talentAIRuntimeContractsV1.js";
import { TALENT_BRIDGE_AUDIENCE_V1, TALENT_BRIDGE_CONSUMER_ID_V1 } from "./talentBridgeConstantsV1.js";
import { talentEndpointV1, type TalentEndpointDependenciesV1, type TalentEndpointRequestV1, type TalentEndpointResponseV1 } from "./talentEndpointV1.js";
import { FailClosedTalentExecutionBoundaryV1 } from "./talentExecutionBoundaryV1.js";
import { GovernedTalentAIRuntimeV1 } from "./governedTalentAIRuntimeV1.js";
import type { TalentReceiptContextV1, TalentReceiptFinalizeInputV1, TalentReceiptReserveDecisionV1 } from "./talentReceiptIdempotencyV1.js";

const authority: TalentContextAuthorityV1 = {
  scope: { environment: "preview", authenticatedConsumerId: TALENT_BRIDGE_CONSUMER_ID_V1, hcmCompanyId: "fixture-company", auraTenantId: "fixture-tenant" },
  policyRevision: "synthetic-v1",
};
function payload() {
  return {
    protocol: "HCM_AURA_TALENT_BRIDGE_V1", requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2", hcmCompanyId: "fixture-company",
    evaluationMode: "EVALUATION", advisoryOnly: true, humanDecisionRequired: true,
    employmentActionAllowed: false, scoreBlendingAllowed: false,
    jobProfile: { jobProfileRef: "JOB_PROFILE_1", requiredSkillRefs: [], requiredCertificationRefs: [],
      promotionThreshold: { performanceScoreMin: 80, potentialScoreMin: 75, promotionReadinessMin: 80, maxDisciplinaryIncidents: 1 } },
    subjects: [{ subjectRef: "INTERNAL_1", subjectType: "INTERNAL",
      performance: { evidenceRef: "PERFORMANCE_1", performanceScore: 84, potentialScore: 80, promotionReadiness: 82,
        attendanceScore: 92, documentationScore: 80, disciplineScore: 100, tenureScore: 78, careerScore: 82,
        riskLevel: "LOW", matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL" },
      hardStops: { evidenceRef: "HARD_STOP_1", passed: true, readinessOverride: null, riskFlags: [], confidenceImpact: 0 },
      evidenceQuality: "EVIDENCE_COMPLETE" }],
  };
}
function request(body: unknown = payload()): TalentEndpointRequestV1 {
  return { method: "POST", rawHeaders: ["Authorization", "Bearer fixture-token", "Content-Type", "application/json"], rawBody: Buffer.from(JSON.stringify(body), "utf8") };
}
class MemoryResponse implements TalentEndpointResponseV1 {
  statusCode = 0;
  body = "";
  readonly headers = new Map<string, string>();
  setHeader(name: string, value: string): void { this.headers.set(name.toLowerCase(), value); }
  end(body: string): void { this.body = body; }
}
const reserved: TalentReceiptReserveDecisionV1 = {
  kind: "RESERVED_OWNER", documentId: "fixture-receipt", reservationId: "fixture-reservation", requestFingerprint: "fixture-fingerprint",
};
function harness(options: {
  decision?: TalentReceiptReserveDecisionV1;
  providerFailure?: boolean;
  reserveFailure?: boolean;
  finalizeFailure?: boolean;
  tenantFailure?: boolean;
} = {}) {
  const events: string[] = [];
  const contexts: TalentReceiptContextV1[] = [];
  const finalizations: TalentReceiptFinalizeInputV1[] = [];
  const contextCompiler = new AuraTalentContextCompilerV1({ ...authority, rules: TALENT_CONTEXT_RULES_V1 }, authority);
  const runtime = new GovernedTalentAIRuntimeV1({
    authority,
    clock: { now: () => 0, schedule: () => () => undefined },
    contextCompiler: { compile: async (value, signal) => {
      events.push("compile"); return contextCompiler.compile(value, signal);
    } },
    provider: { generate: async () => {
      events.push("provider");
      if (options.providerFailure) throw new Error("private-provider-detail");
      return { schemaVersion: "TALENT_AI_CANDIDATE_V1", subjectRef: "INTERNAL_1", findings: [] };
    } },
  });
  const dependencies: TalentEndpointDependenciesV1 = {
    readCredentialSet: () => { events.push("credential"); return { primary: "fixture-token" }; },
    readAuthenticatedPrincipal: () => { events.push("principal"); return { consumerId: TALENT_BRIDGE_CONSUMER_ID_V1, audience: TALENT_BRIDGE_AUDIENCE_V1 }; },
    readProjectId: () => { events.push("project"); return "aura-intel-preview"; },
    createTenantRegistry: () => {
      events.push("registryFactory");
      return { readAuthoritySnapshot: async (value) => {
        events.push("registryRead");
        const mapping = { ...value, mappingId: "fixture-mapping", auraTenantId: "fixture-tenant", status: "ACTIVE" };
        return options.tenantFailure ? { forward: [], reverse: [] } : { forward: [mapping], reverse: [mapping] };
      } };
    },
    createReceiptStore: () => {
      events.push("receiptFactory");
      return {
        reserve: async (value) => {
          events.push("reserve"); contexts.push(value);
          if (options.reserveFailure) throw new Error("private-reserve-detail");
          return options.decision ?? reserved;
        },
        finalize: async (value) => {
          events.push("finalize"); finalizations.push(value);
          if (options.finalizeFailure) throw new Error("private-finalize-detail");
          return { documentId: "fixture-receipt", requestId: value.context.canonicalRequest.requestId,
            correlationId: value.context.canonicalRequest.correlationId,
            terminalHttpStatus: value.terminalHttpStatus, terminalOutcomeCode: value.terminalOutcomeCode };
        },
      };
    },
    createExecutionBoundary: () => { events.push("boundaryFactory"); return runtime; },
  };
  return { events, contexts, finalizations, dependencies };
}
async function invoke(state: ReturnType<typeof harness>, value = request()) {
  const response = new MemoryResponse();
  await talentEndpointV1(value, response, state.dependencies);
  return response;
}
function assertError(response: MemoryResponse, code: string, status = 503): void {
  assert.equal(response.statusCode, status);
  const body = JSON.parse(response.body) as { error: { code: string }; advisoryOnly: boolean; humanDecisionRequired: boolean };
  assert.equal(body.error.code, code);
  assert.equal(body.advisoryOnly, true); assert.equal(body.humanDecisionRequired, true);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(response.body, /fixture-tenant|fixture-company|private-|findings|ADVISORY_VALIDATED/u);
}

test("fake-backed execution preserves certified order and exact failure finalization", async () => {
  const state = harness(); const response = await invoke(state);
  assertError(response, "INTERNAL_FAILURE");
  assert.deepEqual(state.events, ["credential", "principal", "project", "registryFactory", "registryRead", "receiptFactory", "reserve", "boundaryFactory", "compile", "provider", "finalize"]);
  assert.equal(state.finalizations.length, 1);
  assert.deepEqual(state.finalizations[0], {
    context: state.contexts[0], reservationId: "fixture-reservation", terminalHttpStatus: 503, terminalOutcomeCode: "INTERNAL_FAILURE",
  });
  assert.equal(state.finalizations[0].context, state.contexts[0]);
  assert.equal(state.contexts[0].auraTenantId, "fixture-tenant");
});

test("runtime failure never finalizes and does not retry", async () => {
  const state = harness({ providerFailure: true });
  assertError(await invoke(state), "INTERNAL_FAILURE");
  assert.equal(state.events.filter((event) => event === "provider").length, 1);
  assert.equal(state.finalizations.length, 0);
});

test("non-owner receipt outcomes and finalized replay never construct or execute runtime", async () => {
  const cases: Array<readonly [TalentReceiptReserveDecisionV1, string, number]> = [
    [{ kind: "IDEMPOTENCY_CONFLICT", documentId: "fixture" }, "IDEMPOTENCY_CONFLICT", 409],
    [{ kind: "IDEMPOTENCY_IN_PROGRESS", documentId: "fixture" }, "IDEMPOTENCY_IN_PROGRESS", 409],
    [{ kind: "OUTCOME_UNKNOWN", documentId: "fixture" }, "OUTCOME_UNKNOWN", 503],
    [{ kind: "REPLAY_FINALIZED", documentId: "fixture", requestId: payload().requestId, correlationId: payload().correlationId,
      terminalHttpStatus: 503, terminalOutcomeCode: "INTERNAL_FAILURE" }, "INTERNAL_FAILURE", 503],
    [{ kind: "REPLAY_FINALIZED", documentId: "fixture", requestId: payload().requestId, correlationId: payload().correlationId,
      terminalHttpStatus: 200, terminalOutcomeCode: "SUCCESS" }, "INTERNAL_FAILURE", 503],
  ];
  for (const [decision, code, status] of cases) {
    const state = harness({ decision }); assertError(await invoke(state), code, status);
    for (const event of ["boundaryFactory", "compile", "provider", "finalize"]) assert.equal(state.events.includes(event), false);
  }
});

test("certified preconditions reject before receipt and runtime execution", async () => {
  const cases: Array<readonly [TalentEndpointRequestV1, string, number]> = [
    [{ ...request(), method: "GET" }, "METHOD_NOT_ALLOWED", 405],
    [{ ...request(), rawHeaders: ["Content-Type", "application/json"] }, "AUTHENTICATION_FAILED", 401],
    [request({ fullName: "forbidden" }), "PROHIBITED_PII", 400],
    [request({ ...payload(), scoreBlendingAllowed: true }), "SCHEMA_VIOLATION", 400],
  ];
  for (const [value, code, status] of cases) {
    const state = harness(); assertError(await invoke(state, value), code, status);
    for (const event of ["project", "receiptFactory", "boundaryFactory", "compile", "provider"]) assert.equal(state.events.includes(event), false);
  }
  const tenant = harness({ tenantFailure: true });
  assertError(await invoke(tenant), "TENANT_MISMATCH", 403);
  assert.equal(tenant.events.includes("receiptFactory"), false);
});

test("reserve and finalize failures expose neither advisory nor internal details", async () => {
  const reserve = harness({ reserveFailure: true });
  assertError(await invoke(reserve), "INTERNAL_FAILURE");
  assert.equal(reserve.events.includes("provider"), false);
  const finalize = harness({ finalizeFailure: true });
  assertError(await invoke(finalize), "INTERNAL_FAILURE");
  assert.equal(finalize.events.filter((event) => event === "provider").length, 1);
});

test("certified fail-closed implementation remains available and has no provider execution", async () => {
  const state = harness();
  const response = new MemoryResponse();
  await talentEndpointV1(request(), response, {
    ...state.dependencies,
    createExecutionBoundary: () => new FailClosedTalentExecutionBoundaryV1(),
  });
  assertError(response, "INTERNAL_FAILURE");
  assert.equal(state.events.includes("provider"), false);
  assert.equal(state.finalizations.length, 0);
});
