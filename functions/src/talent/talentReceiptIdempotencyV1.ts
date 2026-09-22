import { createHash, randomUUID } from "node:crypto";

import type { TalentCanonicalRequestV1 } from "./talentRequestSchemaV1.js";
import type { TalentBridgeEnvironmentV1 } from "./talentBridgeConstantsV1.js";

export const TALENT_RECEIPT_COLLECTION_V1 =
  "hcm_talent_request_receipts_v1" as const;

export const TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1 =
  "SHA-256" as const;

export const TALENT_RECEIPT_LEASE_MS_V1 =
  120_000 as const;

export const TALENT_RECEIPT_RETENTION_MS_V1 =
  30 * 24 * 60 * 60 * 1000;

export type TalentReceiptStateV1 =
  | "RESERVED"
  | "FINALIZED"
  | "OUTCOME_UNKNOWN";

export interface TalentReceiptContextV1 {
  readonly environment: TalentBridgeEnvironmentV1;
  readonly authenticatedConsumerId: string;
  readonly auraTenantId: string;
  readonly canonicalRequest: TalentCanonicalRequestV1;
}

export interface TalentReceiptIdentityV1 {
  readonly documentId: string;
  readonly requestFingerprint: string;
}

export interface TalentReceiptRecordV1 {
  readonly protocol: string;
  readonly environment: TalentBridgeEnvironmentV1;
  readonly authenticatedConsumerId: string;
  readonly hcmCompanyId: string;
  readonly auraTenantId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly requestFingerprint: string;
  readonly fingerprintAlgorithm:
    typeof TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1;
  readonly state: TalentReceiptStateV1;
  readonly reservationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly leaseExpiresAt: Date;
  readonly expiresAt: Date;
  readonly terminalHttpStatus?: number;
  readonly terminalOutcomeCode?: string;
}

export type TalentReceiptReserveDecisionV1 =
  | {
      readonly kind: "RESERVED_OWNER";
      readonly documentId: string;
      readonly reservationId: string;
      readonly requestFingerprint: string;
    }
  | {
      readonly kind: "REPLAY_FINALIZED";
      readonly documentId: string;
      readonly requestId: string;
      readonly correlationId: string;
      readonly terminalHttpStatus: number;
      readonly terminalOutcomeCode: string;
    }
  | {
      readonly kind: "IDEMPOTENCY_CONFLICT";
      readonly documentId: string;
    }
  | {
      readonly kind: "IDEMPOTENCY_IN_PROGRESS";
      readonly documentId: string;
    }
  | {
      readonly kind: "OUTCOME_UNKNOWN";
      readonly documentId: string;
    };

export interface TalentReceiptFinalizeInputV1 {
  readonly context: TalentReceiptContextV1;
  readonly reservationId: string;
  readonly terminalHttpStatus: number;
  readonly terminalOutcomeCode: string;
}

export interface TalentReceiptFinalizedV1 {
  readonly documentId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly terminalHttpStatus: number;
  readonly terminalOutcomeCode: string;
}

export interface TalentReceiptStoreV1 {
  reserve(
    context: TalentReceiptContextV1,
  ): Promise<TalentReceiptReserveDecisionV1>;

  finalize(
    input: TalentReceiptFinalizeInputV1,
  ): Promise<TalentReceiptFinalizedV1>;
}

export class TalentReceiptInvariantErrorV1 extends Error {
  constructor(message = "Talent receipt invariant violated.") {
    super(message);
    this.name = "TalentReceiptInvariantErrorV1";
  }
}

function requireNonEmpty(
  value: string,
  field: string,
): string {
  if (value.length === 0) {
    throw new TalentReceiptInvariantErrorV1(
      `${field} must not be empty.`,
    );
  }

  return value;
}

function requireValidDate(
  value: Date,
  field: string,
): Date {
  if (
    !(value instanceof Date) ||
    !Number.isFinite(value.getTime())
  ) {
    throw new TalentReceiptInvariantErrorV1(
      `${field} must be a valid Date.`,
    );
  }

  return new Date(value.getTime());
}

function sha256Hex(
  value: string,
): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function canonicalTalentRequestProjectionV1(
  request: TalentCanonicalRequestV1,
): Record<string, unknown> {
  return {
    protocol: request.protocol,
    requestId: request.requestId,
    correlationId: request.correlationId,
    hcmCompanyId: request.hcmCompanyId,
    evaluationMode: request.evaluationMode,
    advisoryOnly: request.advisoryOnly,
    humanDecisionRequired: request.humanDecisionRequired,
    employmentActionAllowed: request.employmentActionAllowed,
    scoreBlendingAllowed: request.scoreBlendingAllowed,
    jobProfile: {
      jobProfileRef: request.jobProfile.jobProfileRef,
      requiredSkillRefs: [
        ...request.jobProfile.requiredSkillRefs,
      ],
      requiredCertificationRefs: [
        ...request.jobProfile.requiredCertificationRefs,
      ],
      promotionThreshold: {
        performanceScoreMin:
          request.jobProfile.promotionThreshold.performanceScoreMin,
        potentialScoreMin:
          request.jobProfile.promotionThreshold.potentialScoreMin,
        promotionReadinessMin:
          request.jobProfile.promotionThreshold.promotionReadinessMin,
        maxDisciplinaryIncidents:
          request.jobProfile.promotionThreshold.maxDisciplinaryIncidents,
      },
    },
    subjects: request.subjects.map((subject) => ({
      subjectRef: subject.subjectRef,
      subjectType: subject.subjectType,
      performance: {
        evidenceRef: subject.performance.evidenceRef,
        performanceScore: subject.performance.performanceScore,
        potentialScore: subject.performance.potentialScore,
        promotionReadiness:
          subject.performance.promotionReadiness,
        attendanceScore: subject.performance.attendanceScore,
        documentationScore:
          subject.performance.documentationScore,
        disciplineScore: subject.performance.disciplineScore,
        tenureScore: subject.performance.tenureScore,
        careerScore: subject.performance.careerScore,
        riskLevel: subject.performance.riskLevel,
        matrixCell: subject.performance.matrixCell,
      },
      hardStops: {
        evidenceRef: subject.hardStops.evidenceRef,
        passed: subject.hardStops.passed,
        readinessOverride:
          subject.hardStops.readinessOverride,
        riskFlags: [
          ...subject.hardStops.riskFlags,
        ],
        confidenceImpact:
          subject.hardStops.confidenceImpact,
      },
      evidenceQuality: subject.evidenceQuality,
    })),
  };
}

export function serializeTalentCanonicalRequestV1(
  request: TalentCanonicalRequestV1,
): string {
  return JSON.stringify(
    canonicalTalentRequestProjectionV1(request),
  );
}

export function buildTalentReceiptIdentityV1(
  context: TalentReceiptContextV1,
): TalentReceiptIdentityV1 {
  const environment =
    requireNonEmpty(
      context.environment,
      "environment",
    );

  const authenticatedConsumerId =
    requireNonEmpty(
      context.authenticatedConsumerId,
      "authenticatedConsumerId",
    );

  const hcmCompanyId =
    requireNonEmpty(
      context.canonicalRequest.hcmCompanyId,
      "hcmCompanyId",
    );

  const requestId =
    requireNonEmpty(
      context.canonicalRequest.requestId,
      "requestId",
    );

  requireNonEmpty(
    context.auraTenantId,
    "auraTenantId",
  );

  const documentId =
    sha256Hex(
      [
        environment,
        authenticatedConsumerId,
        hcmCompanyId,
        requestId,
      ].join("\n"),
    );

  const requestFingerprint =
    sha256Hex(
      serializeTalentCanonicalRequestV1(
        context.canonicalRequest,
      ),
    );

  return Object.freeze({
    documentId,
    requestFingerprint,
  });
}

export function createTalentReservationIdV1(): string {
  return randomUUID().toLowerCase();
}

export function createTalentReservedReceiptV1(
  context: TalentReceiptContextV1,
  nowInput: Date,
  reservationIdInput = createTalentReservationIdV1(),
): TalentReceiptRecordV1 {
  const now =
    requireValidDate(
      nowInput,
      "now",
    );

  const reservationId =
    requireNonEmpty(
      reservationIdInput,
      "reservationId",
    );

  const identity =
    buildTalentReceiptIdentityV1(context);

  const leaseExpiresAt =
    new Date(
      now.getTime() +
      TALENT_RECEIPT_LEASE_MS_V1,
    );

  const expiresAt =
    new Date(
      now.getTime() +
      TALENT_RECEIPT_RETENTION_MS_V1,
    );

  return Object.freeze({
    protocol:
      context.canonicalRequest.protocol,
    environment:
      context.environment,
    authenticatedConsumerId:
      context.authenticatedConsumerId,
    hcmCompanyId:
      context.canonicalRequest.hcmCompanyId,
    auraTenantId:
      context.auraTenantId,
    requestId:
      context.canonicalRequest.requestId,
    correlationId:
      context.canonicalRequest.correlationId,
    requestFingerprint:
      identity.requestFingerprint,
    fingerprintAlgorithm:
      TALENT_RECEIPT_FINGERPRINT_ALGORITHM_V1,
    state:
      "RESERVED",
    reservationId,
    createdAt:
      new Date(now.getTime()),
    updatedAt:
      new Date(now.getTime()),
    leaseExpiresAt,
    expiresAt,
  });
}
