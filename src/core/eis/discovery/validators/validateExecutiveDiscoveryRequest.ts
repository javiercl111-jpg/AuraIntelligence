import type { ZodError } from 'zod';
import { CapabilityErrorCategory } from '../../types';
import type { ExecutiveDiscoveryRequest } from '../contracts';
import { EXECUTIVE_DISCOVERY_SCHEMA_VERSION } from '../contracts';
import { ExecutiveDiscoveryErrorCode } from '../errors';
import { executiveDiscoveryRequestSchema } from '../schemas';
import type { DiscoveryValidationResult } from './DiscoveryValidationResult';

function formatIssues(error: ZodError): readonly string[] {
  return error.issues.slice(0, 10).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'request';
    return `${path}: ${issue.message}`;
  });
}

function readSchemaVersion(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }

  const value = (input as Readonly<Record<string, unknown>>).schemaVersion;
  return typeof value === 'string' ? value : undefined;
}

export function validateExecutiveDiscoveryRequest(
  input: unknown,
): DiscoveryValidationResult<ExecutiveDiscoveryRequest> {
  try {
    const schemaVersion = readSchemaVersion(input);
    if (
      schemaVersion !== undefined &&
      schemaVersion !== EXECUTIVE_DISCOVERY_SCHEMA_VERSION
    ) {
      return {
        success: false,
        error: {
          code: ExecutiveDiscoveryErrorCode.UNSUPPORTED_SCHEMA_VERSION,
          message: 'The Executive Discovery schema version is not supported.',
          category: CapabilityErrorCategory.VALIDATION,
          retryable: false,
          safeDetails: {
            supportedSchemaVersion: EXECUTIVE_DISCOVERY_SCHEMA_VERSION,
          },
        },
      };
    }

    const parsed = executiveDiscoveryRequestSchema.safeParse(input);
    if (parsed.success) {
      return { success: true, data: parsed.data };
    }

    const evidenceIssue = parsed.error.issues.some((issue) => issue.path[0] === 'evidence');
    return {
      success: false,
      error: {
        code: evidenceIssue
          ? ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_EVIDENCE
          : ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_REQUEST,
        message: evidenceIssue
          ? 'The Executive Discovery evidence is invalid.'
          : 'The Executive Discovery request is invalid.',
        category: CapabilityErrorCategory.VALIDATION,
        retryable: false,
        safeDetails: { issues: formatIssues(parsed.error) },
      },
    };
  } catch {
    return {
      success: false,
      error: {
        code: ExecutiveDiscoveryErrorCode.INVALID_DISCOVERY_REQUEST,
        message: 'The Executive Discovery request could not be validated.',
        category: CapabilityErrorCategory.VALIDATION,
        retryable: false,
      },
    };
  }
}
