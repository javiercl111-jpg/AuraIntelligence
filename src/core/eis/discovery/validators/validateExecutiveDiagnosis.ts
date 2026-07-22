import type { ZodError } from 'zod';
import { CapabilityErrorCategory } from '../../types';
import type { ExecutiveDiagnosis, ExecutiveDiscoveryRequest } from '../contracts';
import { ExecutiveDiscoveryErrorCode } from '../errors';
import { executiveDiagnosisSchema } from '../schemas';
import type { DiscoveryValidationResult } from './DiscoveryValidationResult';

function formatIssues(error: ZodError): readonly string[] {
  return error.issues.slice(0, 10).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'diagnosis';
    return `${path}: ${issue.message}`;
  });
}

function collectEvidenceReferences(diagnosis: ExecutiveDiagnosis): readonly string[] {
  return [
    ...diagnosis.evidenceIds,
    ...diagnosis.businessSnapshot.confirmedFacts.flatMap((fact) => fact.evidenceIds),
    ...diagnosis.businessSnapshot.inferredFacts.flatMap((fact) => fact.evidenceIds),
    ...diagnosis.businessSnapshot.systemObservations.flatMap((fact) => fact.evidenceIds),
    ...diagnosis.businessSnapshot.missingInformation.flatMap((item) => item.evidenceIds),
    ...diagnosis.maturity.evidenceIds,
    ...diagnosis.maturity.dimensions.flatMap((dimension) => dimension.evidenceIds),
    ...diagnosis.risks.flatMap((risk) => risk.evidenceIds),
    ...diagnosis.opportunities.flatMap((opportunity) => opportunity.evidenceIds),
    ...diagnosis.recommendations.flatMap((recommendation) => recommendation.evidenceIds),
    ...diagnosis.actions.flatMap((action) => action.evidenceIds),
  ];
}

function findIdentityMismatches(
  diagnosis: ExecutiveDiagnosis,
  request: ExecutiveDiscoveryRequest,
): readonly string[] {
  const mismatches: string[] = [];
  if (diagnosis.organizationId !== request.organizationId) mismatches.push('organizationId');
  if (diagnosis.tenantId !== request.tenantId) mismatches.push('tenantId');
  if (diagnosis.companyId !== request.companyId) mismatches.push('companyId');
  if (diagnosis.sessionId !== request.sessionId) mismatches.push('sessionId');
  if (diagnosis.capabilityVersion !== request.capabilityVersion) mismatches.push('capabilityVersion');
  if (diagnosis.generationMetadata.requestId !== request.requestId) {
    mismatches.push('generationMetadata.requestId');
  }
  if (diagnosis.generationMetadata.correlationId !== request.correlationId) {
    mismatches.push('generationMetadata.correlationId');
  }
  return mismatches;
}

function findActionReferenceMismatches(diagnosis: ExecutiveDiagnosis): readonly string[] {
  const actionIds = new Set(diagnosis.actions.map((action) => action.actionId));
  const invalid = new Set<string>();

  diagnosis.actions.forEach((action) => {
    action.dependencies.forEach((dependencyId) => {
      if (!actionIds.has(dependencyId) || dependencyId === action.actionId) {
        invalid.add(dependencyId);
      }
    });
  });
  diagnosis.recommendations.forEach((recommendation) => {
    recommendation.linkedActionIds.forEach((actionId) => {
      if (!actionIds.has(actionId)) invalid.add(actionId);
    });
  });

  return [...invalid].sort();
}

export function validateExecutiveDiagnosis(
  input: unknown,
  request?: ExecutiveDiscoveryRequest,
): DiscoveryValidationResult<ExecutiveDiagnosis> {
  try {
    const parsed = executiveDiagnosisSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: ExecutiveDiscoveryErrorCode.INVALID_DIAGNOSIS,
          message: 'The Executive Diagnosis is invalid.',
          category: CapabilityErrorCategory.VALIDATION,
          retryable: false,
          safeDetails: { issues: formatIssues(parsed.error) },
        },
      };
    }

    if (request !== undefined) {
      const mismatches = findIdentityMismatches(parsed.data, request);
      if (mismatches.length > 0) {
        return {
          success: false,
          error: {
            code: ExecutiveDiscoveryErrorCode.INVALID_DIAGNOSIS,
            message: 'The Executive Diagnosis does not match its request context.',
            category: CapabilityErrorCategory.INTEGRITY,
            retryable: false,
            safeDetails: { mismatchedFields: mismatches },
          },
        };
      }

      const availableEvidenceIds = new Set(request.evidence.map((item) => item.evidenceId));
      const missingEvidenceIds = [
        ...new Set(
          collectEvidenceReferences(parsed.data).filter(
            (evidenceId) => !availableEvidenceIds.has(evidenceId),
          ),
        ),
      ].sort();
      if (missingEvidenceIds.length > 0) {
        return {
          success: false,
          error: {
            code: ExecutiveDiscoveryErrorCode.EVIDENCE_REFERENCE_MISMATCH,
            message: 'The Executive Diagnosis references unavailable evidence.',
            category: CapabilityErrorCategory.INTEGRITY,
            retryable: false,
            safeDetails: { missingEvidenceIds },
          },
        };
      }
    }

    const invalidActionIds = findActionReferenceMismatches(parsed.data);
    if (invalidActionIds.length > 0) {
      return {
        success: false,
        error: {
          code: ExecutiveDiscoveryErrorCode.INVALID_DIAGNOSIS,
          message: 'The Executive Diagnosis contains invalid action references.',
          category: CapabilityErrorCategory.INTEGRITY,
          retryable: false,
          safeDetails: { invalidActionIds },
        },
      };
    }

    return { success: true, data: parsed.data };
  } catch {
    return {
      success: false,
      error: {
        code: ExecutiveDiscoveryErrorCode.INVALID_DIAGNOSIS,
        message: 'The Executive Diagnosis could not be validated.',
        category: CapabilityErrorCategory.VALIDATION,
        retryable: false,
      },
    };
  }
}
