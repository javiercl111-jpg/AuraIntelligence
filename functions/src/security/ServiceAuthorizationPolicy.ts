import type { SecurityEnvironment } from './SecurityEnvironment';
import type { ServiceIdentity } from './ServiceIdentity';
import {
  authorizationFailure,
  ServiceAuthorizationErrorCode,
  type ServiceAuthorizationResult,
} from './ServiceAuthorizationResult';

export interface ServiceAuthorizationTarget {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly companyId?: string;
}

export interface ServiceAuthorizationPolicyConfig {
  readonly allowedSubjects: readonly string[];
  readonly environment: SecurityEnvironment;
  readonly claimsVersion: string;
}

function containsExact(values: readonly string[], target: string): boolean {
  return values.includes(target);
}

export class ServiceAuthorizationPolicy {
  public constructor(
    private readonly config: ServiceAuthorizationPolicyConfig,
  ) {}

  public authorize(
    identity: ServiceIdentity,
    target: ServiceAuthorizationTarget,
  ): ServiceAuthorizationResult {
    if (!containsExact(this.config.allowedSubjects, identity.subject)) {
      return authorizationFailure(
        ServiceAuthorizationErrorCode.SUBJECT_NOT_AUTHORIZED,
      );
    }

    if (identity.environment !== this.config.environment) {
      return authorizationFailure(
        ServiceAuthorizationErrorCode.ENVIRONMENT_NOT_AUTHORIZED,
      );
    }

    if (identity.claimsVersion !== this.config.claimsVersion) {
      return authorizationFailure(
        ServiceAuthorizationErrorCode.CLAIMS_VERSION_UNSUPPORTED,
      );
    }

    if (!containsExact(identity.authorizedTenantIds, target.tenantId)) {
      return authorizationFailure(
        ServiceAuthorizationErrorCode.TENANT_NOT_AUTHORIZED,
      );
    }

    if (
      !containsExact(identity.authorizedOrganizationIds, target.organizationId)
    ) {
      return authorizationFailure(
        ServiceAuthorizationErrorCode.ORGANIZATION_NOT_AUTHORIZED,
      );
    }

    if (
      target.companyId !== undefined &&
      !containsExact(identity.authorizedCompanyIds ?? [], target.companyId)
    ) {
      return authorizationFailure(
        ServiceAuthorizationErrorCode.COMPANY_NOT_AUTHORIZED,
      );
    }

    return { allowed: true };
  }
}
