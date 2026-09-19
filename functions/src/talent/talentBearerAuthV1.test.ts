import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  authenticateTalentBearerTokenV1,
  enforceTalentAuthenticatedPrincipalV1,
  readTalentBearerTokenV1,
  TalentBearerAuthErrorV1,
  type TalentBearerAuthErrorCodeV1,
} from "./talentBearerAuthV1.js";
import {
  parseTalentAuthSecretConfigV1,
  TalentAuthSecretConfigurationErrorV1,
} from "./talentAuthSecretConfigV1.js";
import {
  TALENT_BRIDGE_AUDIENCE_V1,
  TALENT_BRIDGE_CONSUMER_ID_V1,
} from "./talentBridgeConstantsV1.js";

function assertAuthError(
  operation: () => unknown,
  expectedCode: TalentBearerAuthErrorCodeV1,
): void {
  assert.throws(operation, (error: unknown) => {
    return error instanceof TalentBearerAuthErrorV1 && error.code === expectedCode;
  });
}

test("missing Authorization is rejected", () => {
  assertAuthError(() => readTalentBearerTokenV1(["Host", "localhost"]),
    "AUTHENTICATION_FAILED");
});

test("malformed Bearer credentials are rejected", () => {
  for (const value of [
    "Bearer",
    "Bearer ",
    "Bearer  token",
    "Bearer token value",
    "Bearer token,value",
    "Bearer token\rvalue",
    `Bearer ${"x".repeat(4097)}`,
  ]) {
    assertAuthError(
      () => readTalentBearerTokenV1(["Authorization", value]),
      "AUTHENTICATION_FAILED",
    );
  }
});

test("duplicate Authorization fields are rejected case-insensitively", () => {
  assertAuthError(
    () => readTalentBearerTokenV1([
      "Authorization",
      "Bearer primary-token",
      "authorization",
      "Bearer secondary-token",
    ]),
    "AUTHENTICATION_FAILED",
  );
});

test("wrong authorization scheme is rejected", () => {
  assertAuthError(
    () => readTalentBearerTokenV1(["Authorization", "Basic primary-token"]),
    "AUTHENTICATION_FAILED",
  );
});

test("wrong bearer token is rejected", () => {
  const config = parseTalentAuthSecretConfigV1({ primary: "primary-token" });
  assertAuthError(
    () => authenticateTalentBearerTokenV1("wrong-token", config),
    "AUTHENTICATION_FAILED",
  );
});

test("primary and secondary credentials are independently accepted", () => {
  const config = parseTalentAuthSecretConfigV1({
    primary: "primary-token",
    secondary: "secondary-token",
  });

  for (const token of ["primary-token", "secondary-token"]) {
    assert.doesNotThrow(() => authenticateTalentBearerTokenV1(token, config));
  }
});

test("a removed secondary credential is rejected", () => {
  const rotatedConfig = parseTalentAuthSecretConfigV1({
    primary: "new-primary-token",
  });
  assertAuthError(
    () => authenticateTalentBearerTokenV1("secondary-token", rotatedConfig),
    "AUTHENTICATION_FAILED",
  );
});

test("malformed secret configuration fails generically", () => {
  for (const value of [
    null,
    [],
    {},
    { primary: "" },
    { primary: " token" },
    { primary: "token", consumerId: TALENT_BRIDGE_CONSUMER_ID_V1 },
    { primary: "one", secondary: "two", third: "three" },
  ]) {
    assert.throws(
      () => parseTalentAuthSecretConfigV1(value),
      TalentAuthSecretConfigurationErrorV1,
    );
  }
});

test("duplicate primary and secondary credentials are rejected", () => {
  assert.throws(
    () => parseTalentAuthSecretConfigV1({
      primary: "same-token",
      secondary: "same-token",
    }),
    TalentAuthSecretConfigurationErrorV1,
  );
});

test("wrong consumer is forbidden by pure principal enforcement", () => {
  assertAuthError(
    () => enforceTalentAuthenticatedPrincipalV1({
      consumerId: "wrong-consumer",
      audience: TALENT_BRIDGE_AUDIENCE_V1,
    }),
    "CONSUMER_FORBIDDEN",
  );
});

test("wrong audience is forbidden by pure principal enforcement", () => {
  assertAuthError(
    () => enforceTalentAuthenticatedPrincipalV1({
      consumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
      audience: "wrong-audience",
    }),
    "CONSUMER_FORBIDDEN",
  );
});
