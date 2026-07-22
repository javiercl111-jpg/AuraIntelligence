import { z } from 'zod';
import type {
  DiscoveryJsonValue,
  DiscoveryMetadata,
  ExecutiveDiscoveryEvidence,
  ExecutiveDiscoveryRequest,
} from '../contracts';
import { EXECUTIVE_DISCOVERY_SCHEMA_VERSION } from '../contracts';
import {
  DiscoveryEvidenceClassification,
  DiscoveryEvidenceSourceType,
} from '../enums';

const nonEmptyStringSchema = z
  .string()
  .min(1)
  .max(2_048)
  .refine((value) => value.trim().length > 0, 'Must contain non-whitespace characters');

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const discoveryJsonValueSchema: z.ZodType<DiscoveryJsonValue> = z.json();

const metadataKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/, 'Metadata keys may contain letters, digits, dot, underscore, and dash');

const metadataValueSchema = z.union([
  z.string().max(2_048),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const discoveryMetadataSchema: z.ZodType<DiscoveryMetadata> = z
  .record(metadataKeySchema, metadataValueSchema)
  .superRefine((metadata, context) => {
    if (Object.keys(metadata).length > 20) {
      context.addIssue({
        code: 'custom',
        message: 'Metadata may contain at most 20 entries',
      });
    }
  });

export const executiveDiscoveryEvidenceSchema: z.ZodType<ExecutiveDiscoveryEvidence> =
  z.strictObject({
    evidenceId: nonEmptyStringSchema,
    sourceType: z.enum(DiscoveryEvidenceSourceType),
    sourceReference: nonEmptyStringSchema,
    fieldId: nonEmptyStringSchema.optional(),
    questionId: nonEmptyStringSchema.optional(),
    value: discoveryJsonValueSchema,
    normalizedValue: discoveryJsonValueSchema.optional(),
    capturedAt: isoDateTimeSchema,
    classification: z.enum(DiscoveryEvidenceClassification),
    consentScope: nonEmptyStringSchema,
    confidence: z.number().finite().min(0).max(1),
    hash: nonEmptyStringSchema.max(256).optional(),
    metadata: discoveryMetadataSchema.optional(),
  });

const executiveDiscoveryConsentAssertionSchema = z.strictObject({
  receiptId: nonEmptyStringSchema,
  privacyConsent: z.literal(true),
  diagnosticProcessingConsent: z.literal(true),
  marketingConsent: z.boolean().optional(),
  consentVersion: nonEmptyStringSchema,
  capturedAt: isoDateTimeSchema,
});

export const executiveDiscoveryRequestSchema: z.ZodType<ExecutiveDiscoveryRequest> =
  z
    .strictObject({
      schemaVersion: z.literal(EXECUTIVE_DISCOVERY_SCHEMA_VERSION),
      capabilityVersion: nonEmptyStringSchema,
      requestId: nonEmptyStringSchema,
      correlationId: nonEmptyStringSchema,
      idempotencyKey: nonEmptyStringSchema,
      organizationId: nonEmptyStringSchema,
      tenantId: nonEmptyStringSchema,
      companyId: nonEmptyStringSchema,
      sessionId: nonEmptyStringSchema,
      discoveryDefinitionVersion: nonEmptyStringSchema,
      locale: nonEmptyStringSchema.max(32),
      requestedAt: isoDateTimeSchema,
      evidence: z.array(executiveDiscoveryEvidenceSchema).min(1).max(500),
      consentAssertion: executiveDiscoveryConsentAssertionSchema,
      metadata: discoveryMetadataSchema.optional(),
    })
    .superRefine((request, context) => {
      const evidenceIds = new Set<string>();
      request.evidence.forEach((evidence, index) => {
        if (evidenceIds.has(evidence.evidenceId)) {
          context.addIssue({
            code: 'custom',
            path: ['evidence', index, 'evidenceId'],
            message: 'Evidence identifiers must be unique',
          });
        }
        evidenceIds.add(evidence.evidenceId);
      });
    });
