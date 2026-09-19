import { createHash, timingSafeEqual } from "node:crypto";

import {
  isValidOpaqueBearerCredentialV1,
  type TalentAuthSecretConfigV1,
} from "./talentAuthSecretConfigV1.js";
import {
  TALENT_BRIDGE_AUDIENCE_V1,
  TALENT_BRIDGE_CONSUMER_ID_V1,
} from "./talentBridgeConstantsV1.js";

export type TalentBearerAuthErrorCodeV1 =
  | "AUTHENTICATION_FAILED"
  | "CONSUMER_FORBIDDEN";

export class TalentBearerAuthErrorV1 extends Error {
  constructor(readonly code: TalentBearerAuthErrorCodeV1) {
    super(code);
    this.name = "TalentBearerAuthErrorV1";
  }
}

export interface TalentAuthenticatedPrincipalV1 {
  readonly consumerId: string;
  readonly audience: string;
}

function authenticationFailed(): never {
  throw new TalentBearerAuthErrorV1("AUTHENTICATION_FAILED");
}

export function readTalentBearerTokenV1(
  rawHeaders: readonly string[],
): string {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) {
    return authenticationFailed();
  }

  const authorizationValues: string[] = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (
      typeof name !== "string" ||
      typeof value !== "string"
    ) {
      return authenticationFailed();
    }
    if (name.toLowerCase() === "authorization") {
      authorizationValues.push(value);
    }
  }

  if (authorizationValues.length !== 1) {
    return authenticationFailed();
  }

  const authorization = authorizationValues[0];
  if (
    authorization.length < 8 ||
    authorization.slice(0, 6).toLowerCase() !== "bearer" ||
    authorization[6] !== " " ||
    authorization[7] === " " ||
    authorization.includes(",")
  ) {
    return authenticationFailed();
  }

  const token = authorization.slice(7);
  if (!isValidOpaqueBearerCredentialV1(token)) {
    return authenticationFailed();
  }

  return token;
}

export function enforceTalentAuthenticatedPrincipalV1(
  principal: TalentAuthenticatedPrincipalV1,
): TalentAuthenticatedPrincipalV1 {
  if (
    principal.consumerId !== TALENT_BRIDGE_CONSUMER_ID_V1 ||
    principal.audience !== TALENT_BRIDGE_AUDIENCE_V1
  ) {
    throw new TalentBearerAuthErrorV1("CONSUMER_FORBIDDEN");
  }

  return Object.freeze({
    consumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
    audience: TALENT_BRIDGE_AUDIENCE_V1,
  });
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authenticateTalentBearerTokenV1(
  suppliedToken: string,
  credentialSet: TalentAuthSecretConfigV1,
): void {
  const suppliedDigest = sha256(suppliedToken);
  const activeCredentials =
    credentialSet.secondary === undefined
      ? [credentialSet.primary]
      : [credentialSet.primary, credentialSet.secondary];

  let matchCount = 0;
  for (const credential of activeCredentials) {
    const credentialDigest = sha256(credential);
    if (timingSafeEqual(suppliedDigest, credentialDigest)) {
      matchCount += 1;
    }
  }

  if (matchCount !== 1) {
    authenticationFailed();
  }
}
