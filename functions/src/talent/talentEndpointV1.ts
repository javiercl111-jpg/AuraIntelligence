import {
  type TalentBridgeEnvironmentV1,
} from "./talentBridgeConstantsV1.js";
import {
  authenticateTalentBearerTokenV1,
  enforceTalentAuthenticatedPrincipalV1,
  readTalentBearerTokenV1,
  TalentBearerAuthErrorV1,
  type TalentAuthenticatedPrincipalV1,
} from "./talentBearerAuthV1.js";
import { parseTalentAuthSecretConfigV1 } from "./talentAuthSecretConfigV1.js";
import {
  createTalentErrorResponseV1,
  TALENT_ENDPOINT_ERRORS_V1,
  TalentEndpointErrorV1,
  type TalentEndpointErrorCodeV1,
} from "./talentEndpointErrorsV1.js";
import { enforceTalentPiiGovernanceV1 } from "./talentPiiGovernanceV1.js";
import { parseTalentRawJsonV1 } from "./talentRawJsonV1.js";
import {
  validateTalentRequestSchemaV1,
  type TalentCanonicalRequestV1,
} from "./talentRequestSchemaV1.js";import {
  type TalentReceiptContextV1,
  type TalentReceiptStoreV1,
} from "./talentReceiptIdempotencyV1.js";
import {
  resolveTalentBridgeEnvironmentV1,
  resolveTalentTenantAuthorityV1,
  TalentTenantMismatchErrorV1,
  type TalentTenantRegistryV1,
} from "./talentTenantAuthorityV1.js";

export interface TalentEndpointRequestV1 {
  readonly method?: string;
  readonly rawHeaders: readonly string[];
  readonly rawBody: unknown;
}

export interface TalentEndpointResponseV1 {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body: string): unknown;
}

export interface TalentEndpointDependenciesV1 {
  readonly readCredentialSet: () => unknown;
  readonly readAuthenticatedPrincipal: () => TalentAuthenticatedPrincipalV1;
  readonly readProjectId: () => string | undefined;
  readonly createTenantRegistry: () => TalentTenantRegistryV1;
  readonly createReceiptStore: () => TalentReceiptStoreV1;
}

function sendError(
  response: TalentEndpointResponseV1,
  code: TalentEndpointErrorCodeV1,
  requestId: string | null = null,
  correlationId: string | null = null,
): void {
  const definition = TALENT_ENDPOINT_ERRORS_V1[code];
  response.statusCode = definition.statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  if (code === "AUTHENTICATION_FAILED") {
    response.setHeader("WWW-Authenticate", "Bearer");
  }
  if (code === "METHOD_NOT_ALLOWED") {
    response.setHeader("Allow", "POST");
  }
  response.end(JSON.stringify(
    createTalentErrorResponseV1(code, requestId, correlationId),
  ));
}

function sendCaughtEndpointError(
  response: TalentEndpointResponseV1,
  error: unknown,
): void {
  if (error instanceof TalentEndpointErrorV1) {
    sendError(response, error.code);
    return;
  }
  sendError(response, "INTERNAL_FAILURE");
}

export async function talentEndpointV1(
  request: TalentEndpointRequestV1,
  response: TalentEndpointResponseV1,
  dependencies: TalentEndpointDependenciesV1,
): Promise<void> {
  if (request.method !== "POST") {
    sendError(response, "METHOD_NOT_ALLOWED");
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
      sendError(response, "AUTHENTICATION_FAILED");
      return;
    }
    sendError(response, "INTERNAL_FAILURE");
    return;
  }

  let principal: TalentAuthenticatedPrincipalV1;
  try {
    const credentialSet = parseTalentAuthSecretConfigV1(
      dependencies.readCredentialSet(),
    );
    authenticateTalentBearerTokenV1(suppliedToken, credentialSet);
    principal = enforceTalentAuthenticatedPrincipalV1(
      dependencies.readAuthenticatedPrincipal(),
    );
  } catch (error: unknown) {
    if (error instanceof TalentBearerAuthErrorV1) {
      if (error.code === "AUTHENTICATION_FAILED") {
        sendError(response, "AUTHENTICATION_FAILED");
        return;
      }
      if (error.code === "CONSUMER_FORBIDDEN") {
        sendError(response, "CONSUMER_FORBIDDEN");
        return;
      }
    }
    sendError(response, "INTERNAL_FAILURE");
    return;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseTalentRawJsonV1(request);
    enforceTalentPiiGovernanceV1(parsed);
  } catch (error: unknown) {
    sendCaughtEndpointError(response, error);
    return;
  }

  let canonicalRequest: TalentCanonicalRequestV1;
  try {
    canonicalRequest = validateTalentRequestSchemaV1(parsed);
  } catch (error: unknown) {
    sendCaughtEndpointError(response, error);
    return;
  }

  const requestId = canonicalRequest.requestId;
  const correlationId = canonicalRequest.correlationId;
  let environment: TalentBridgeEnvironmentV1;
  try {
    environment = resolveTalentBridgeEnvironmentV1(dependencies.readProjectId());
  } catch {
    sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
    return;
  }

  let auraTenantId: string;
  try {
    const registry = dependencies.createTenantRegistry();
    auraTenantId = await resolveTalentTenantAuthorityV1({
      environment,
      authenticatedConsumerId: principal.consumerId,
      hcmCompanyId: canonicalRequest.hcmCompanyId,
    }, registry);
  } catch (error: unknown) {
    if (error instanceof TalentTenantMismatchErrorV1) {
      sendError(response, "TENANT_MISMATCH", requestId, correlationId);
      return;
    }
    sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
    return;
  }

  const receiptContext: TalentReceiptContextV1 = Object.freeze({
    environment,
    authenticatedConsumerId: principal.consumerId,
    auraTenantId,
    canonicalRequest,
  });

  try {
    const receiptStore = dependencies.createReceiptStore();
    const decision = await receiptStore.reserve(receiptContext);

    if (decision.kind === "IDEMPOTENCY_CONFLICT") {
      sendError(response, "IDEMPOTENCY_CONFLICT", requestId, correlationId);
      return;
    }

    if (decision.kind === "IDEMPOTENCY_IN_PROGRESS") {
      sendError(response, "IDEMPOTENCY_IN_PROGRESS", requestId, correlationId);
      return;
    }

    if (decision.kind === "OUTCOME_UNKNOWN") {
      sendError(response, "OUTCOME_UNKNOWN", requestId, correlationId);
      return;
    }

    if (decision.kind === "REPLAY_FINALIZED") {
      if (
        decision.terminalHttpStatus !== 503 ||
        decision.terminalOutcomeCode !== "INTERNAL_FAILURE"
      ) {
        sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
        return;
      }

      sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
      return;
    }

    if (decision.kind !== "RESERVED_OWNER") {
      sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
      return;
    }

    await receiptStore.finalize({
      context: receiptContext,
      reservationId: decision.reservationId,
      terminalHttpStatus: 503,
      terminalOutcomeCode: "INTERNAL_FAILURE",
    });
  } catch {
    sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
    return;
  }

  sendError(response, "INTERNAL_FAILURE", requestId, correlationId);
}
