import { strict as assert } from "node:assert";
import { test } from "node:test";

import { type TalentAuthenticatedPrincipalV1 } from "./talentBearerAuthV1.js";
import {
  TALENT_BRIDGE_AUDIENCE_V1,
  TALENT_BRIDGE_CONSUMER_ID_V1,
  TALENT_BRIDGE_PROTOCOL_V1,
} from "./talentBridgeConstantsV1.js";
import {
  talentEndpointV1,
  type TalentEndpointDependenciesV1,
  type TalentEndpointRequestV1,
  type TalentEndpointResponseV1,
} from "./talentEndpointV1.js";
import type {
  TalentTenantAuthorityInputV1,
  TalentTenantMappingCandidateV1,
  TalentTenantRegistryV1,
} from "./talentTenantAuthorityV1.js";

class MemoryResponse implements TalentEndpointResponseV1 {
  statusCode = 0;
  readonly headers = new Map<string, string>();
  body = "";

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  end(body: string): this {
    this.body = body;
    return this;
  }

  header(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  json(): Record<string, unknown> {
    return JSON.parse(this.body) as Record<string, unknown>;
  }
}

const authenticatedPrincipalV1: TalentAuthenticatedPrincipalV1 = Object.freeze({
  consumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
  audience: TALENT_BRIDGE_AUDIENCE_V1,
});

function validPayload(): Record<string, unknown> {
  return {
    protocol: TALENT_BRIDGE_PROTOCOL_V1,
    requestId: "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21",
    correlationId: "9d95c68b-2a91-4cd0-ae64-04c84418d6e2",
    hcmCompanyId: "company_123",
    evaluationMode: "EVALUATION",
    advisoryOnly: true,
    humanDecisionRequired: true,
    employmentActionAllowed: false,
    scoreBlendingAllowed: false,
    jobProfile: {
      jobProfileRef: "JOB_PROFILE_1",
      requiredSkillRefs: ["SKILL_1"],
      requiredCertificationRefs: ["CERTIFICATION_1"],
      promotionThreshold: {
        performanceScoreMin: 80,
        potentialScoreMin: 75,
        promotionReadinessMin: 80,
        maxDisciplinaryIncidents: 1,
      },
    },
    subjects: [{
      subjectRef: "INTERNAL_1",
      subjectType: "INTERNAL",
      performance: {
        evidenceRef: "PERFORMANCE_1",
        performanceScore: 84,
        potentialScore: 80,
        promotionReadiness: 82,
        attendanceScore: 92,
        documentationScore: 80,
        disciplineScore: 100,
        tenureScore: 78,
        careerScore: 82,
        riskLevel: "LOW",
        matrixCell: "HIGH_PERFORMANCE_MEDIUM_POTENTIAL",
      },
      hardStops: {
        evidenceRef: "HARD_STOP_1",
        passed: true,
        readinessOverride: null,
        riskFlags: [],
        confidenceImpact: 0,
      },
      evidenceQuality: "EVIDENCE_COMPLETE",
    }],
  };
}

function postRequest(
  token = "primary-token",
  payload: unknown = validPayload(),
): TalentEndpointRequestV1 {
  return {
    method: "POST",
    rawHeaders: [
      "Authorization", `Bearer ${token}`,
      "Content-Type", "application/json",
    ],
    rawBody: Buffer.from(JSON.stringify(payload), "utf8"),
  };
}

function mapping(
  input: TalentTenantAuthorityInputV1,
  overrides: Partial<TalentTenantMappingCandidateV1> = {},
): TalentTenantMappingCandidateV1 {
  return {
    mappingId: "mapping-1",
    environment: input.environment,
    authenticatedConsumerId: input.authenticatedConsumerId,
    hcmCompanyId: input.hcmCompanyId,
    auraTenantId: "aura-tenant-secret",
    status: "ACTIVE",
    ...overrides,
  };
}

function activeRegistry(): TalentTenantRegistryV1 {
  return {
    readAuthoritySnapshot: async (input) => ({
      forward: [mapping(input)],
      reverse: [mapping(input)],
    }),
  };
}

function defaultDependencies(
  overrides: Partial<TalentEndpointDependenciesV1> = {},
): TalentEndpointDependenciesV1 {
  return {
    readCredentialSet: () => ({ primary: "primary-token" }),
    readAuthenticatedPrincipal: () => authenticatedPrincipalV1,
    readProjectId: () => "aura-intel-preview",
    createTenantRegistry: activeRegistry,
    ...overrides,
  };
}

async function invoke(
  request: TalentEndpointRequestV1,
  overrides: Partial<TalentEndpointDependenciesV1> = {},
): Promise<MemoryResponse> {
  const response = new MemoryResponse();
  await talentEndpointV1(request, response, defaultDependencies(overrides));
  return response;
}

function assertErrorResponse(
  response: MemoryResponse,
  status: number,
  code: string,
  ids: "null" | "validated" = "null",
): void {
  assert.equal(response.statusCode, status);
  assert.equal(response.header("Content-Type"), "application/json");
  assert.equal(response.header("Cache-Control"), "no-store");
  const payload = response.json();
  assert.equal((payload.error as Record<string, unknown>).code, code);
  assert.equal(
    payload.requestId,
    ids === "validated" ? "b3b7f26e-6a4f-4b72-9e5c-6d3bafc14a21" : null,
  );
  assert.equal(
    payload.correlationId,
    ids === "validated" ? "9d95c68b-2a91-4cd0-ae64-04c84418d6e2" : null,
  );
}

test("non-POST is method-first and touches no headers, secrets, project, or body", async () => {
  let dependencyCalls = 0;
  const request = {
    method: "GET",
    get rawHeaders(): readonly string[] {
      throw new Error("headers must not be read");
    },
    get rawBody(): never {
      throw new Error("body must not be read");
    },
  };
  const response = new MemoryResponse();
  await talentEndpointV1(request, response, {
    readCredentialSet: () => { dependencyCalls += 1; throw new Error(); },
    readAuthenticatedPrincipal: () => { dependencyCalls += 1; throw new Error(); },
    readProjectId: () => { dependencyCalls += 1; throw new Error(); },
    createTenantRegistry: () => { dependencyCalls += 1; throw new Error(); },
  });
  assertErrorResponse(response, 405, "METHOD_NOT_ALLOWED");
  assert.equal(response.header("Allow"), "POST");
  assert.equal(dependencyCalls, 0);
});

test("Bearer extraction failure reads no secret, principal, project, or body", async () => {
  let bodyReads = 0;
  let dependencyCalls = 0;
  const request = {
    method: "POST",
    rawHeaders: ["Content-Type", "application/json"],
    get rawBody(): Buffer {
      bodyReads += 1;
      return Buffer.from("{}", "utf8");
    },
  };
  const response = await invoke(request, {
    readCredentialSet: () => { dependencyCalls += 1; return {}; },
    readAuthenticatedPrincipal: () => { dependencyCalls += 1; return authenticatedPrincipalV1; },
    readProjectId: () => { dependencyCalls += 1; return "aura-intel-preview"; },
    createTenantRegistry: () => { dependencyCalls += 1; return activeRegistry(); },
  });
  assertErrorResponse(response, 401, "AUTHENTICATION_FAILED");
  assert.equal(response.header("WWW-Authenticate"), "Bearer");
  assert.equal(bodyReads, 0);
  assert.equal(dependencyCalls, 0);
});

test("wrong credential and malformed secret inspect no body or downstream authority", async () => {
  for (const configuration of [
    { token: "wrong-token", secret: { primary: "primary-token" }, status: 401, code: "AUTHENTICATION_FAILED" },
    { token: "primary-token", secret: { primary: "primary-token", extra: "secret" }, status: 503, code: "INTERNAL_FAILURE" },
  ]) {
    let bodyReads = 0;
    let projectReads = 0;
    const base = postRequest(configuration.token);
    const request = {
      method: base.method,
      rawHeaders: base.rawHeaders,
      get rawBody(): Buffer {
        bodyReads += 1;
        return base.rawBody as Buffer;
      },
    };
    const response = await invoke(request, {
      readCredentialSet: () => configuration.secret,
      readProjectId: () => { projectReads += 1; return "aura-intel-preview"; },
    });
    assertErrorResponse(response, configuration.status, configuration.code);
    assert.equal(bodyReads, 0);
    assert.equal(projectReads, 0);
    assert.doesNotMatch(response.body, /wrong-token|primary-token|extra/u);
  }
});

test("wrong server-owned consumer or audience inspects no body", async () => {
  for (const principal of [
    { consumerId: "wrong-consumer", audience: TALENT_BRIDGE_AUDIENCE_V1 },
    { consumerId: TALENT_BRIDGE_CONSUMER_ID_V1, audience: "wrong-audience" },
  ]) {
    let bodyReads = 0;
    let projectReads = 0;
    const base = postRequest();
    const request = {
      method: base.method,
      rawHeaders: base.rawHeaders,
      get rawBody(): Buffer {
        bodyReads += 1;
        return base.rawBody as Buffer;
      },
    };
    const response = await invoke(request, {
      readAuthenticatedPrincipal: () => principal,
      readProjectId: () => { projectReads += 1; return "aura-intel-preview"; },
    });
    assertErrorResponse(response, 403, "CONSUMER_FORBIDDEN");
    assert.equal(bodyReads, 0);
    assert.equal(projectReads, 0);
  }
});

test("invalid media, malformed JSON, prohibited PII, and invalid schema never read project or registry", async () => {
  const requests: Array<readonly [TalentEndpointRequestV1, number, string]> = [
    [{ ...postRequest(), rawHeaders: ["Authorization", "Bearer primary-token"] }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    [{ ...postRequest(), rawBody: Buffer.from('{"broken":}', "utf8") }, 400, "MALFORMED_REQUEST"],
    [postRequest("primary-token", { name: "prohibited" }), 400, "PROHIBITED_PII"],
    [postRequest("primary-token", { protocol: TALENT_BRIDGE_PROTOCOL_V1 }), 400, "SCHEMA_VIOLATION"],
  ];

  for (const [request, status, code] of requests) {
    let projectReads = 0;
    let registryCreates = 0;
    const response = await invoke(request, {
      readProjectId: () => { projectReads += 1; return "aura-intel-preview"; },
      createTenantRegistry: () => { registryCreates += 1; return activeRegistry(); },
    });
    assertErrorResponse(response, status, code);
    assert.equal(projectReads, 0);
    assert.equal(registryCreates, 0);
  }
});

test("executes the ratified authentication, body, project, and tenant order", async () => {
  const events: string[] = [];
  const base = postRequest();
  let headerReads = 0;
  const request = {
    method: "POST",
    get rawHeaders(): readonly string[] {
      headerReads += 1;
      events.push(headerReads === 1 ? "bearer" : "media");
      return base.rawHeaders;
    },
    get rawBody(): Buffer {
      events.push("rawBody");
      return base.rawBody as Buffer;
    },
  };
  const response = new MemoryResponse();
  await talentEndpointV1(request, response, {
    readCredentialSet: () => { events.push("credential"); return { primary: "primary-token" }; },
    readAuthenticatedPrincipal: () => { events.push("principal"); return authenticatedPrincipalV1; },
    readProjectId: () => { events.push("project"); return "aura-intel-preview"; },
    createTenantRegistry: () => {
      events.push("registryFactory");
      return {
        readAuthoritySnapshot: async (input) => {
          events.push("registryRead");
          return { forward: [mapping(input)], reverse: [mapping(input)] };
        },
      };
    },
  });
  assert.deepEqual(events, [
    "bearer", "credential", "principal", "media", "rawBody",
    "project", "registryFactory", "registryRead",
  ]);
  assertErrorResponse(response, 503, "INTERNAL_FAILURE", "validated");
});

test("passes the exact canonical company and server-owned authority to the resolver", async () => {
  let received: TalentTenantAuthorityInputV1 | undefined;
  const response = await invoke(postRequest(), {
    createTenantRegistry: () => ({
      readAuthoritySnapshot: async (input) => {
        received = input;
        return { forward: [mapping(input)], reverse: [mapping(input)] };
      },
    }),
  });
  assert.deepEqual(received, {
    environment: "preview",
    authenticatedConsumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
    hcmCompanyId: "company_123",
  });
  assertErrorResponse(response, 503, "INTERNAL_FAILURE", "validated");
});

test("unknown server project is an internal failure and does not initialize Firestore", async () => {
  let registryCreates = 0;
  const response = await invoke(postRequest(), {
    readProjectId: () => "unknown-project",
    createTenantRegistry: () => { registryCreates += 1; return activeRegistry(); },
  });
  assertErrorResponse(response, 503, "INTERNAL_FAILURE", "validated");
  assert.equal(registryCreates, 0);
});

test("missing, disabled, ambiguous, and reverse-conflicting mappings return TENANT_MISMATCH", async () => {
  const snapshotFactories: Array<(input: TalentTenantAuthorityInputV1) => {
    forward: readonly TalentTenantMappingCandidateV1[];
    reverse: readonly TalentTenantMappingCandidateV1[];
  }> = [
    () => ({ forward: [], reverse: [] }),
    (input) => ({
      forward: [mapping(input, { status: "DISABLED" })],
      reverse: [mapping(input, { status: "DISABLED" })],
    }),
    (input) => ({
      forward: [mapping(input), mapping(input, { mappingId: "mapping-2" })],
      reverse: [mapping(input)],
    }),
    (input) => ({
      forward: [mapping(input)],
      reverse: [mapping(input, { hcmCompanyId: "other-company" })],
    }),
  ];
  for (const makeSnapshot of snapshotFactories) {
    const response = await invoke(postRequest(), {
      createTenantRegistry: () => ({
        readAuthoritySnapshot: async (input) => makeSnapshot(input),
      }),
    });
    assertErrorResponse(response, 403, "TENANT_MISMATCH", "validated");
    assert.doesNotMatch(response.body, /aura-tenant-secret|company_123/u);
  }
});

test("Firestore read failure returns generic internal failure with validated IDs", async () => {
  const response = await invoke(postRequest(), {
    createTenantRegistry: () => ({
      readAuthoritySnapshot: async () => {
        throw new Error("sensitive-firestore-detail");
      },
    }),
  });
  assertErrorResponse(response, 503, "INTERNAL_FAILURE", "validated");
  assert.doesNotMatch(response.body, /sensitive-firestore-detail/u);
});

test("fully valid mapped request remains inactive and exposes no Aura tenant", async () => {
  const response = await invoke(postRequest());
  assertErrorResponse(response, 503, "INTERNAL_FAILURE", "validated");
  assert.doesNotMatch(response.body, /aura-tenant-secret|auraTenantId/u);
  assert.equal(response.json().advisoryOnly, true);
  assert.equal(response.json().humanDecisionRequired, true);
});

test("valid mapped request has no provider, replay, persistence, scoring, or employment path", async () => {
  let forbiddenCalls = 0;
  const dependencies = {
    ...defaultDependencies(),
    invokeProvider: () => { forbiddenCalls += 1; },
    implementReplay: () => { forbiddenCalls += 1; },
    persistRequest: () => { forbiddenCalls += 1; },
    scoreTalent: () => { forbiddenCalls += 1; },
    createEmploymentAction: () => { forbiddenCalls += 1; },
  };
  const response = new MemoryResponse();
  await talentEndpointV1(postRequest(), response, dependencies);
  assertErrorResponse(response, 503, "INTERNAL_FAILURE", "validated");
  assert.equal(forbiddenCalls, 0);
});

test("bearer credentials and rejected request content are never logged or reflected", async () => {
  const token = "sensitive-bearer-token";
  const messages: string[] = [];
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  const capture = (...values: unknown[]): void => {
    messages.push(values.map((value) => String(value)).join(" "));
  };
  console.log = capture;
  console.info = capture;
  console.warn = capture;
  console.error = capture;
  try {
    const response = await invoke(
      postRequest(token, { unexpectedSecretField: "sensitive-body-value" }),
      { readCredentialSet: () => ({ primary: token }) },
    );
    assertErrorResponse(response, 400, "SCHEMA_VIOLATION");
    assert.doesNotMatch(response.body, /unexpectedSecretField|sensitive-body-value/u);
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  }
  assert.equal(messages.length, 0);
});
