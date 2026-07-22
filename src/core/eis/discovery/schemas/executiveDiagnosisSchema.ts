import { z } from 'zod';
import { ExecutivePriority } from '../../enums';
import type { ExecutiveDiagnosis } from '../contracts';
import { EXECUTIVE_DISCOVERY_SCHEMA_VERSION } from '../contracts';
import {
  DiscoveryEvidenceClassification,
  ExecutiveActionStatus,
  ExecutiveConfidenceLevel,
  ExecutiveDiagnosisStatus,
  ExecutiveMaturityLevel,
  ExecutiveOpportunityHorizon,
  ExecutiveRiskLikelihood,
  ExecutiveRiskSeverity,
} from '../enums';
import { discoveryJsonValueSchema, isoDateTimeSchema } from './executiveDiscoveryRequestSchema';

const nonEmptyStringSchema = z
  .string()
  .min(1)
  .max(4_096)
  .refine((value) => value.trim().length > 0, 'Must contain non-whitespace characters');

const stringArraySchema = z.array(nonEmptyStringSchema).max(500);
const evidenceReferencesSchema = stringArraySchema.min(1);

export const executiveConfidenceSchema = z.strictObject({
  level: z.enum(ExecutiveConfidenceLevel),
  score: z.number().finite().min(0).max(1),
  basis: stringArraySchema.min(1),
  evidenceCount: z.number().int().min(0),
  missingEvidenceCount: z.number().int().min(0),
  calibrationVersion: nonEmptyStringSchema.optional(),
});

const businessFactSchema = z.strictObject({
  label: nonEmptyStringSchema,
  value: discoveryJsonValueSchema,
  classification: z.enum(DiscoveryEvidenceClassification),
  evidenceIds: evidenceReferencesSchema,
});

const missingInformationSchema = z.strictObject({
  label: nonEmptyStringSchema,
  evidenceIds: evidenceReferencesSchema,
});

const businessSnapshotSchema = z.strictObject({
  confirmedFacts: z.array(
    businessFactSchema.extend({
      classification: z.literal(DiscoveryEvidenceClassification.USER_CONFIRMED),
    }),
  ),
  inferredFacts: z.array(
    businessFactSchema.extend({
      classification: z.literal(DiscoveryEvidenceClassification.INFERRED),
    }),
  ),
  systemObservations: z.array(
    businessFactSchema.extend({
      classification: z.literal(DiscoveryEvidenceClassification.SYSTEM_OBSERVED),
    }),
  ),
  missingInformation: z.array(missingInformationSchema),
});

const maturityDimensionSchema = z.strictObject({
  dimensionId: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  score: z.number().finite().min(0).max(100),
  rationale: nonEmptyStringSchema,
  evidenceIds: evidenceReferencesSchema,
  confidence: executiveConfidenceSchema,
});

const maturitySchema = z.strictObject({
  overallScore: z.number().finite().min(0).max(100),
  level: z.enum(ExecutiveMaturityLevel),
  dimensions: z.array(maturityDimensionSchema),
  rationale: nonEmptyStringSchema,
  evidenceIds: stringArraySchema,
  confidence: executiveConfidenceSchema,
});

const riskSchema = z.strictObject({
  riskId: nonEmptyStringSchema,
  category: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  severity: z.enum(ExecutiveRiskSeverity),
  likelihood: z.enum(ExecutiveRiskLikelihood),
  impact: nonEmptyStringSchema,
  mitigation: nonEmptyStringSchema.optional(),
  confidence: executiveConfidenceSchema,
  evidenceIds: evidenceReferencesSchema,
});

const opportunitySchema = z.strictObject({
  opportunityId: nonEmptyStringSchema,
  category: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  expectedValue: nonEmptyStringSchema,
  feasibility: z.number().finite().min(0).max(1),
  horizon: z.enum(ExecutiveOpportunityHorizon),
  confidence: executiveConfidenceSchema,
  evidenceIds: evidenceReferencesSchema,
});

const recommendationSchema = z.strictObject({
  recommendationId: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  rationale: nonEmptyStringSchema,
  priority: z.enum(ExecutivePriority),
  confidence: executiveConfidenceSchema,
  evidenceIds: evidenceReferencesSchema,
  expectedImpact: nonEmptyStringSchema,
  timeframe: nonEmptyStringSchema,
  linkedActionIds: stringArraySchema,
});

const actionSchema = z.strictObject({
  actionId: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  priority: z.enum(ExecutivePriority),
  ownerRole: nonEmptyStringSchema.optional(),
  timeframe: nonEmptyStringSchema,
  dependencies: stringArraySchema,
  successCriteria: stringArraySchema.min(1),
  evidenceIds: evidenceReferencesSchema,
  status: z.enum(ExecutiveActionStatus),
});

const generationMetadataSchema = z.strictObject({
  requestId: nonEmptyStringSchema,
  correlationId: nonEmptyStringSchema,
  providerId: nonEmptyStringSchema,
  providerVersion: nonEmptyStringSchema,
  deterministic: z.boolean(),
});

function addDuplicateIdIssues(
  values: readonly string[],
  path: string,
  context: z.RefinementCtx,
): void {
  const identifiers = new Set<string>();
  values.forEach((identifier, index) => {
    if (identifiers.has(identifier)) {
      context.addIssue({
        code: 'custom',
        path: [path, index],
        message: 'Identifiers must be unique',
      });
    }
    identifiers.add(identifier);
  });
}

export const executiveDiagnosisSchema: z.ZodType<ExecutiveDiagnosis> = z
  .strictObject({
    diagnosisId: nonEmptyStringSchema,
    schemaVersion: z.literal(EXECUTIVE_DISCOVERY_SCHEMA_VERSION),
    capabilityVersion: nonEmptyStringSchema,
    organizationId: nonEmptyStringSchema,
    tenantId: nonEmptyStringSchema,
    companyId: nonEmptyStringSchema,
    sessionId: nonEmptyStringSchema,
    status: z.enum(ExecutiveDiagnosisStatus),
    executiveSummary: nonEmptyStringSchema,
    businessSnapshot: businessSnapshotSchema,
    maturity: maturitySchema,
    risks: z.array(riskSchema),
    opportunities: z.array(opportunitySchema),
    recommendations: z.array(recommendationSchema),
    actions: z.array(actionSchema),
    confidence: executiveConfidenceSchema,
    evidenceIds: stringArraySchema,
    warnings: stringArraySchema,
    generatedAt: isoDateTimeSchema,
    generationMetadata: generationMetadataSchema,
  })
  .superRefine((diagnosis, context) => {
    addDuplicateIdIssues(
      diagnosis.risks.map((risk) => risk.riskId),
      'risks',
      context,
    );
    addDuplicateIdIssues(
      diagnosis.opportunities.map((opportunity) => opportunity.opportunityId),
      'opportunities',
      context,
    );
    addDuplicateIdIssues(
      diagnosis.recommendations.map((recommendation) => recommendation.recommendationId),
      'recommendations',
      context,
    );
    addDuplicateIdIssues(
      diagnosis.actions.map((action) => action.actionId),
      'actions',
      context,
    );
  });
