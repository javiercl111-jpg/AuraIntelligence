import type { SecurityEnvironment } from './SecurityEnvironment';
import { SecurityEnvironment as SecurityEnvironmentValue } from './SecurityEnvironment';
import {
  ServiceAuthenticationMethod,
  type ServiceIdentity,
} from './ServiceIdentity';
import type {
  ServiceIdentityVerificationContext,
  ServiceIdentityVerifier,
} from './ServiceIdentityVerifier';
import {
  identityVerificationFailure,
  ServiceIdentityVerificationErrorCode,
  type ServiceIdentityVerificationResult,
} from './ServiceIdentityVerificationResult';

export interface DevelopmentServiceCredential {
  readonly token: string;
  readonly subject: string;
}

export interface DevelopmentServiceIdentityVerifierConfig {
  readonly environment: SecurityEnvironment;
  readonly credentials: readonly DevelopmentServiceCredential[];
}

function copyGrants(
  grants: Readonly<Record<string, readonly string[]>> | undefined,
  subject: string,
): readonly string[] {
  return [...(grants?.[subject] ?? [])];
}

/**
 * Development-only identity adapter. This is deliberately not a production
 * authentication mechanism and must never be enabled in production.
 */
export class DevelopmentServiceIdentityVerifier
  implements ServiceIdentityVerifier
{
  public constructor(
    private readonly config: DevelopmentServiceIdentityVerifierConfig,
  ) {}

  public async verify(
    token: string,
    context: ServiceIdentityVerificationContext,
  ): Promise<ServiceIdentityVerificationResult> {
    if (
      context.environment === SecurityEnvironmentValue.PRODUCTION ||
      this.config.environment === SecurityEnvironmentValue.PRODUCTION ||
      context.environment !== this.config.environment
    ) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.UNSUPPORTED_AUTH_METHOD,
      );
    }

    if (
      this.config.credentials.length === 0 ||
      context.allowedIssuers.length === 0 ||
      context.allowedAudiences.length === 0
    ) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INTERNAL_IDENTITY_ERROR,
      );
    }

    const credential = this.config.credentials.find(
      (candidate) => candidate.token === token,
    );
    if (credential === undefined) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (!context.allowedSubjects.includes(credential.subject)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.CALLER_NOT_ALLOWED,
      );
    }

    const identity: ServiceIdentity = {
      subject: credential.subject,
      issuer: context.allowedIssuers[0],
      audience: [context.allowedAudiences[0]],
      authenticationMethod:
        context.environment === SecurityEnvironmentValue.TEST
          ? ServiceAuthenticationMethod.TEST
          : ServiceAuthenticationMethod.DEVELOPMENT,
      environment: context.environment,
      authorizedTenantIds: copyGrants(
        context.subjectTenantGrants,
        credential.subject,
      ),
      authorizedOrganizationIds: copyGrants(
        context.subjectOrganizationGrants,
        credential.subject,
      ),
      authorizedCompanyIds: copyGrants(
        context.subjectCompanyGrants,
        credential.subject,
      ),
      claimsVersion: context.claimsVersion,
    };

    return { success: true, identity };
  }
}
