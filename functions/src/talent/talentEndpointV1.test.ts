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
  type TalentEndpointRequestV1,
  type TalentEndpointResponseV1,
} from "./talentEndpointV1.js";

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
}

const authenticatedPrincipalV1: TalentAuthenticatedPrincipalV1 = Object.freeze({
  consumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
  audience: TALENT_BRIDGE_AUDIENCE_V1,
});

function postRequest(token = "primary-token"): TalentEndpointRequestV1 {
  return {
    method: "POST",
    rawHeaders: ["Authorization", `bEaReR ${token}`],
  };
}

function invoke(
  request: TalentEndpointRequestV1,
  secret: unknown = { primary: "primary-token" },
  principal: TalentAuthenticatedPrincipalV1 = authenticatedPrincipalV1,
): MemoryResponse {
  const response = new MemoryResponse();
  talentEndpointV1(request, response, {
    readCredentialSet: () => secret,
    readAuthenticatedPrincipal: () => principal,
  });
  return response;
}

function assertConsumerForbiddenEndpointPath(
  serverPrincipal: TalentAuthenticatedPrincipalV1,
): void {
  let credentialReads = 0;
  let principalReads = 0;
  let bodyReads = 0;
  let rawBodyReads = 0;
  let tenantAuthorityCalls = 0;
  let providerCalls = 0;
  const request = {
    method: "POST",
    rawHeaders: ["Authorization", "Bearer primary-token"],
    get body(): never {
      bodyReads += 1;
      throw new Error("body must not be read");
    },
    get rawBody(): never {
      rawBodyReads += 1;
      throw new Error("rawBody must not be read");
    },
  };
  const dependencies = {
    readCredentialSet: () => {
      credentialReads += 1;
      return { primary: "primary-token" };
    },
    readAuthenticatedPrincipal: () => {
      principalReads += 1;
      return serverPrincipal;
    },
    resolveTenantAuthority: () => {
      tenantAuthorityCalls += 1;
    },
    invokeProvider: () => {
      providerCalls += 1;
    },
  };
  const response = new MemoryResponse();

  assert.equal("consumerId" in request, false);
  assert.equal("audience" in request, false);
  assert.deepEqual(request.rawHeaders, [
    "Authorization",
    "Bearer primary-token",
  ]);

  talentEndpointV1(request, response, dependencies);

  assert.equal(response.statusCode, 403);
  assert.equal(response.header("Cache-Control"), "no-store");
  assert.deepEqual(JSON.parse(response.body), {
    protocol: TALENT_BRIDGE_PROTOCOL_V1,
    requestId: null,
    correlationId: null,
    error: {
      code: "CONSUMER_FORBIDDEN",
      category: "AUTHORIZATION",
      retryable: false,
      message: "The authenticated consumer is not permitted.",
    },
    advisoryOnly: true,
    humanDecisionRequired: true,
  });
  assert.equal(credentialReads, 1);
  assert.equal(principalReads, 1);
  assert.equal(bodyReads, 0);
  assert.equal(rawBodyReads, 0);
  assert.equal(tenantAuthorityCalls, 0);
  assert.equal(providerCalls, 0);
}

test("missing Authorization returns 401 with required headers", () => {
  let secretReads = 0;
  let principalReads = 0;
  const response = new MemoryResponse();
  talentEndpointV1({ method: "POST", rawHeaders: [] }, response, {
    readCredentialSet: () => {
      secretReads += 1;
      return { primary: "primary-token" };
    },
    readAuthenticatedPrincipal: () => {
      principalReads += 1;
      return authenticatedPrincipalV1;
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.header("WWW-Authenticate"), "Bearer");
  assert.equal(response.header("Cache-Control"), "no-store");
  assert.match(response.body, /"code":"AUTHENTICATION_FAILED"/u);
  assert.equal(secretReads, 0);
  assert.equal(principalReads, 0);
});

test("non-POST is method-first and accesses no auth, secret, or body data", () => {
  let authorizationReads = 0;
  let secretReads = 0;
  let principalReads = 0;
  const request = {
    method: "GET",
    get rawHeaders(): readonly string[] {
      authorizationReads += 1;
      throw new Error("rawHeaders must not be read");
    },
    get body(): never {
      throw new Error("body must not be read");
    },
    get rawBody(): never {
      throw new Error("rawBody must not be read");
    },
  };
  const response = new MemoryResponse();

  talentEndpointV1(request, response, {
    readCredentialSet: () => {
      secretReads += 1;
      throw new Error("secret must not be read");
    },
    readAuthenticatedPrincipal: () => {
      principalReads += 1;
      throw new Error("principal must not be read");
    },
  });

  assert.equal(response.statusCode, 405);
  assert.equal(authorizationReads, 0);
  assert.equal(secretReads, 0);
  assert.equal(principalReads, 0);
});

test("malformed secret configuration returns only generic 503", () => {
  const response = invoke(postRequest(), {
    primary: "primary-token",
    unexpected: "configuration-value",
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.header("Cache-Control"), "no-store");
  assert.match(response.body, /"code":"INTERNAL_FAILURE"/u);
  assert.doesNotMatch(response.body, /unexpected|configuration-value/u);
});

test("wrong bearer returns 401 and does not expose the credential", () => {
  let principalReads = 0;
  const response = new MemoryResponse();
  talentEndpointV1(postRequest("wrong-token"), response, {
    readCredentialSet: () => ({ primary: "primary-token" }),
    readAuthenticatedPrincipal: () => {
      principalReads += 1;
      return authenticatedPrincipalV1;
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.header("WWW-Authenticate"), "Bearer");
  assert.equal(response.header("Cache-Control"), "no-store");
  assert.doesNotMatch(response.body, /wrong-token|primary-token/u);
  assert.equal(principalReads, 0);
});

test("valid Bearer with wrong server-owned consumer returns 403", () => {
  assertConsumerForbiddenEndpointPath({
    consumerId: "wrong-consumer",
    audience: TALENT_BRIDGE_AUDIENCE_V1,
  });
});

test("valid Bearer with wrong server-owned audience returns 403", () => {
  assertConsumerForbiddenEndpointPath({
    consumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
    audience: "wrong-audience",
  });
});

test("authenticated POST still terminates at inactive 503 boundary", () => {
  const response = invoke(postRequest());
  assert.equal(response.statusCode, 503);
  assert.equal(response.header("Cache-Control"), "no-store");
  assert.match(response.body, /"code":"INTERNAL_FAILURE"/u);
  assert.match(response.body, /"advisoryOnly":true/u);
  assert.match(response.body, /"humanDecisionRequired":true/u);
  assert.match(response.body, /"requestId":null/u);
  assert.match(response.body, /"correlationId":null/u);
});

test("request body and rawBody remain untouched", () => {
  const request = {
    method: "POST",
    rawHeaders: ["Authorization", "Bearer primary-token"],
    get body(): never {
      throw new Error("body must not be read");
    },
    get rawBody(): never {
      throw new Error("rawBody must not be read");
    },
  };

  assert.equal(invoke(request).statusCode, 503);
});

test("tenant resolver and provider path are not invoked by the endpoint", () => {
  let tenantResolverCalls = 0;
  let providerCalls = 0;
  const dependencies = {
    readCredentialSet: () => ({ primary: "primary-token" }),
    readAuthenticatedPrincipal: () => authenticatedPrincipalV1,
    resolveTenant: () => {
      tenantResolverCalls += 1;
    },
    invokeProvider: () => {
      providerCalls += 1;
    },
  };
  const response = new MemoryResponse();

  talentEndpointV1(postRequest(), response, dependencies);

  assert.equal(response.statusCode, 503);
  assert.equal(tenantResolverCalls, 0);
  assert.equal(providerCalls, 0);
});

test("bearer credential is never logged", () => {
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
    invoke(postRequest(token), { primary: token });
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  }

  assert.equal(messages.some((message) => message.includes(token)), false);
  assert.equal(messages.length, 0);
});
