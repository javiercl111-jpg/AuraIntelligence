import {
  TALENT_ADVISORY_ONLY_V1,
  TALENT_BRIDGE_PROTOCOL_V1,
  TALENT_HUMAN_DECISION_REQUIRED_V1,
} from "./talentBridgeConstantsV1.js";

export type TalentEndpointErrorCodeV1 =
  | "METHOD_NOT_ALLOWED"
  | "AUTHENTICATION_FAILED"
  | "CONSUMER_FORBIDDEN"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "REQUEST_TOO_LARGE"
  | "MALFORMED_REQUEST"
  | "SCHEMA_VIOLATION"
  | "PROHIBITED_PII"
  | "TENANT_MISMATCH"
  | "INTERNAL_FAILURE";

export interface TalentEndpointErrorDefinitionV1 {
  readonly statusCode: number;
  readonly category: "REQUEST" | "AUTHENTICATION" | "AUTHORIZATION" |
    "GOVERNANCE" | "TENANCY" | "INTERNAL";
  readonly retryable: boolean;
  readonly message: string;
}

export const TALENT_ENDPOINT_ERRORS_V1: Readonly<
  Record<TalentEndpointErrorCodeV1, TalentEndpointErrorDefinitionV1>
> = Object.freeze({
  METHOD_NOT_ALLOWED: Object.freeze({
    statusCode: 405,
    category: "REQUEST",
    retryable: false,
    message: "Only POST requests are supported.",
  }),
  AUTHENTICATION_FAILED: Object.freeze({
    statusCode: 401,
    category: "AUTHENTICATION",
    retryable: false,
    message: "Bearer authentication failed.",
  }),
  CONSUMER_FORBIDDEN: Object.freeze({
    statusCode: 403,
    category: "AUTHORIZATION",
    retryable: false,
    message: "The authenticated consumer is not permitted.",
  }),
  UNSUPPORTED_MEDIA_TYPE: Object.freeze({
    statusCode: 415,
    category: "REQUEST",
    retryable: false,
    message: "The request media type is not supported.",
  }),
  REQUEST_TOO_LARGE: Object.freeze({
    statusCode: 413,
    category: "REQUEST",
    retryable: false,
    message: "The request body is too large.",
  }),
  MALFORMED_REQUEST: Object.freeze({
    statusCode: 400,
    category: "REQUEST",
    retryable: false,
    message: "The request body is malformed.",
  }),
  SCHEMA_VIOLATION: Object.freeze({
    statusCode: 400,
    category: "REQUEST",
    retryable: false,
    message: "The request schema is invalid.",
  }),
  PROHIBITED_PII: Object.freeze({
    statusCode: 400,
    category: "GOVERNANCE",
    retryable: false,
    message: "The request contains prohibited data.",
  }),
  TENANT_MISMATCH: Object.freeze({
    statusCode: 403,
    category: "TENANCY",
    retryable: false,
    message: "The tenant mapping is not permitted.",
  }),
  INTERNAL_FAILURE: Object.freeze({
    statusCode: 503,
    category: "INTERNAL",
    retryable: true,
    message: "Talent Intelligence V1 boundary is not active.",
  }),
});

export class TalentEndpointErrorV1 extends Error {
  constructor(readonly code: TalentEndpointErrorCodeV1) {
    super(code);
    this.name = "TalentEndpointErrorV1";
  }
}

export function throwTalentEndpointErrorV1(
  code: TalentEndpointErrorCodeV1,
): never {
  throw new TalentEndpointErrorV1(code);
}

export function createTalentErrorResponseV1(
  code: TalentEndpointErrorCodeV1,
  requestId: string | null = null,
  correlationId: string | null = null,
): Readonly<Record<string, unknown>> {
  const definition = TALENT_ENDPOINT_ERRORS_V1[code];
  return Object.freeze({
    protocol: TALENT_BRIDGE_PROTOCOL_V1,
    requestId,
    correlationId,
    error: Object.freeze({
      code,
      category: definition.category,
      retryable: definition.retryable,
      message: definition.message,
    }),
    advisoryOnly: TALENT_ADVISORY_ONLY_V1,
    humanDecisionRequired: TALENT_HUMAN_DECISION_REQUIRED_V1,
  });
}
