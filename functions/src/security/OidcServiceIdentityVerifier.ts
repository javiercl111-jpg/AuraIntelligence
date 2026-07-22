import type { SecurityClock } from './SecurityClock';
import {
  SecurityEnvironment,
  type SecurityEnvironment as SecurityEnvironmentType,
} from './SecurityEnvironment';
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
import {
  OidcTokenVerificationErrorCode,
  type OidcTokenVerifier,
} from './OidcTokenVerifier';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isEpochSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseAudience(value: unknown): readonly string[] | undefined {
  if (isNonEmptyString(value)) return [value];
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isNonEmptyString)
  ) {
    return value;
  }
  return undefined;
}

function parseEnvironment(value: unknown): SecurityEnvironmentType | undefined {
  if (
    value === SecurityEnvironment.DEVELOPMENT ||
    value === SecurityEnvironment.TEST ||
    value === SecurityEnvironment.PRODUCTION
  ) {
    return value;
  }
  return undefined;
}

function mapCryptographicFailure(
  code: OidcTokenVerificationErrorCode,
): ServiceIdentityVerificationErrorCode {
  if (code === OidcTokenVerificationErrorCode.INVALID_ISSUER) {
    return ServiceIdentityVerificationErrorCode.INVALID_ISSUER;
  }
  if (code === OidcTokenVerificationErrorCode.INVALID_AUDIENCE) {
    return ServiceIdentityVerificationErrorCode.INVALID_AUDIENCE;
  }
  if (code === OidcTokenVerificationErrorCode.TOKEN_EXPIRED) {
    return ServiceIdentityVerificationErrorCode.TOKEN_EXPIRED;
  }
  if (code === OidcTokenVerificationErrorCode.INTERNAL_ERROR) {
    return ServiceIdentityVerificationErrorCode.INTERNAL_IDENTITY_ERROR;
  }
  return ServiceIdentityVerificationErrorCode.INVALID_TOKEN;
}

function copyGrants(
  grants: Readonly<Record<string, readonly string[]>> | undefined,
  subject: string,
): readonly string[] {
  return [...(grants?.[subject] ?? [])];
}

export class OidcServiceIdentityVerifier implements ServiceIdentityVerifier {
  public constructor(
    private readonly tokenVerifier: OidcTokenVerifier,
    private readonly clock: SecurityClock,
  ) {}

  public async verify(
    token: string,
    context: ServiceIdentityVerificationContext,
  ): Promise<ServiceIdentityVerificationResult> {
    const now = this.clock.nowEpochSeconds();
    const verification = await this.tokenVerifier.verify(token, {
      allowedIssuers: context.allowedIssuers,
      allowedAudiences: context.allowedAudiences,
      nowEpochSeconds: now,
      clockSkewSeconds: context.clockSkewSeconds,
    });

    if (!verification.success) {
      return identityVerificationFailure(
        mapCryptographicFailure(verification.errorCode),
      );
    }

    const claims = verification.claims;
    const issuer = claims.iss;
    const audience = parseAudience(claims.aud);
    const subject = claims.sub;
    const issuedAt = claims.iat;
    const expiresAt = claims.exp;
    const environment = parseEnvironment(claims.environment);
    const claimsVersion = claims.claims_version;
    const tokenId = claims.jti;

    if (!isNonEmptyString(issuer) || !context.allowedIssuers.includes(issuer)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_ISSUER,
      );
    }

    if (
      audience === undefined ||
      !audience.some((value) => context.allowedAudiences.includes(value))
    ) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_AUDIENCE,
      );
    }

    if (!isNonEmptyString(subject)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (!context.allowedSubjects.includes(subject)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.CALLER_NOT_ALLOWED,
      );
    }

    if (!isEpochSeconds(expiresAt)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (expiresAt < now - context.clockSkewSeconds) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.TOKEN_EXPIRED,
      );
    }

    if (!isEpochSeconds(issuedAt)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (issuedAt > now + context.clockSkewSeconds) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (
      now - issuedAt >
      context.tokenMaxAgeSeconds + context.clockSkewSeconds
    ) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (environment === undefined || !isNonEmptyString(claimsVersion)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    if (tokenId !== undefined && !isNonEmptyString(tokenId)) {
      return identityVerificationFailure(
        ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
      );
    }

    const identity: ServiceIdentity = {
      subject,
      issuer,
      audience: [...audience],
      authenticationMethod: ServiceAuthenticationMethod.OIDC,
      environment,
      authorizedTenantIds: copyGrants(context.subjectTenantGrants, subject),
      authorizedOrganizationIds: copyGrants(
        context.subjectOrganizationGrants,
        subject,
      ),
      authorizedCompanyIds: copyGrants(
        context.subjectCompanyGrants,
        subject,
      ),
      issuedAt,
      expiresAt,
      ...(tokenId === undefined ? {} : { tokenId }),
      claimsVersion,
    };

    return { success: true, identity };
  }
}
