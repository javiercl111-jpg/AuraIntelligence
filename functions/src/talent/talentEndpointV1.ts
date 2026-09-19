import {
  authenticateTalentBearerTokenV1,
  enforceTalentAuthenticatedPrincipalV1,
  readTalentBearerTokenV1,
  TalentBearerAuthErrorV1,
  type TalentAuthenticatedPrincipalV1,
} from "./talentBearerAuthV1.js";
import { TALENT_BRIDGE_PROTOCOL_V1 } from "./talentBridgeConstantsV1.js";
import { parseTalentAuthSecretConfigV1 } from "./talentAuthSecretConfigV1.js";

export interface TalentEndpointRequestV1 {
  readonly method?: string;
  readonly rawHeaders: readonly string[];
}

export interface TalentEndpointResponseV1 {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body: string): unknown;
}

export interface TalentEndpointDependenciesV1 {
  readonly readCredentialSet: () => unknown;
  readonly readAuthenticatedPrincipal: () => TalentAuthenticatedPrincipalV1;
}

const inactiveBoundaryResponse = {
  protocol: TALENT_BRIDGE_PROTOCOL_V1,
  requestId: null,
  correlationId: null,
  error: {
    code: "INTERNAL_FAILURE",
    category: "INTERNAL",
    retryable: true,
    message: "Talent Intelligence V1 boundary is not active.",
  },
  advisoryOnly: true,
  humanDecisionRequired: true,
} as const;

const authenticationFailureResponse = {
  protocol: TALENT_BRIDGE_PROTOCOL_V1,
  requestId: null,
  correlationId: null,
  error: {
    code: "AUTHENTICATION_FAILED",
    category: "AUTHENTICATION",
    retryable: false,
    message: "Bearer authentication failed.",
  },
  advisoryOnly: true,
  humanDecisionRequired: true,
} as const;

const consumerForbiddenResponse = {
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
} as const;

function sendJson(
  response: TalentEndpointResponseV1,
  statusCode: number,
  payload: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value);
  }
  response.end(JSON.stringify(payload));
}

function sendAuthenticationFailure(response: TalentEndpointResponseV1): void {
  sendJson(response, 401, authenticationFailureResponse, {
    "Cache-Control": "no-store",
    "WWW-Authenticate": "Bearer",
  });
}

function sendConsumerForbidden(response: TalentEndpointResponseV1): void {
  sendJson(response, 403, consumerForbiddenResponse, {
    "Cache-Control": "no-store",
  });
}

function sendInternalFailure(response: TalentEndpointResponseV1): void {
  sendJson(response, 503, inactiveBoundaryResponse, {
    "Cache-Control": "no-store",
  });
}

export function talentEndpointV1(
  request: TalentEndpointRequestV1,
  response: TalentEndpointResponseV1,
  dependencies: TalentEndpointDependenciesV1,
): void {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method Not Allowed" });
    return;
  }

  let suppliedToken: string;
  try {
    suppliedToken = readTalentBearerTokenV1(request.rawHeaders);
  } catch (error: unknown) {
    if (
      error instanceof TalentBearerAuthErrorV1 &&
      error.code === "AUTHENTICATION_FAILED"
    ) {
      sendAuthenticationFailure(response);
      return;
    }
    sendInternalFailure(response);
    return;
  }

  try {
    const credentialSet = parseTalentAuthSecretConfigV1(
      dependencies.readCredentialSet(),
    );
    authenticateTalentBearerTokenV1(suppliedToken, credentialSet);
    const principal = dependencies.readAuthenticatedPrincipal();
    enforceTalentAuthenticatedPrincipalV1(principal);
  } catch (error: unknown) {
    if (error instanceof TalentBearerAuthErrorV1) {
      if (error.code === "AUTHENTICATION_FAILED") {
        sendAuthenticationFailure(response);
        return;
      }
      if (error.code === "CONSUMER_FORBIDDEN") {
        sendConsumerForbidden(response);
        return;
      }
    }
    sendInternalFailure(response);
    return;
  }

  sendInternalFailure(response);
}
