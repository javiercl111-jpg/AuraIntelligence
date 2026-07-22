import { describe, expect, it } from 'vitest';
import {
  DevelopmentServiceIdentityVerifier,
  SecurityEnvironment,
  ServiceAuthenticationMethod,
  ServiceIdentityVerificationErrorCode,
  type SecurityEnvironment as SecurityEnvironmentType,
  type ServiceIdentityVerificationContext,
} from '../src/security';

const TOKEN = 'configured-development-token';
const SUBJECT = 'control-center-backend';

function context(
  environment: SecurityEnvironmentType,
): ServiceIdentityVerificationContext {
  return {
    allowedIssuers: ['development://aura-control-center'],
    allowedAudiences: ['aura-intelligence'],
    allowedSubjects: [SUBJECT],
    environment,
    subjectTenantGrants: { [SUBJECT]: ['tenant-001'] },
    subjectOrganizationGrants: { [SUBJECT]: ['organization-001'] },
    subjectCompanyGrants: { [SUBJECT]: ['company-001'] },
    clockSkewSeconds: 0,
    tokenMaxAgeSeconds: 300,
    claimsVersion: '1',
  };
}

function verifier(environment: SecurityEnvironmentType) {
  return new DevelopmentServiceIdentityVerifier({
    environment,
    credentials: [{ token: TOKEN, subject: SUBJECT }],
  });
}

describe('DevelopmentServiceIdentityVerifier', () => {
  it('constructs an allowlisted identity in development', async () => {
    const result = await verifier(SecurityEnvironment.DEVELOPMENT).verify(
      TOKEN,
      context(SecurityEnvironment.DEVELOPMENT),
    );
    expect(result).toMatchObject({
      success: true,
      identity: {
        subject: SUBJECT,
        authenticationMethod: ServiceAuthenticationMethod.DEVELOPMENT,
        authorizedTenantIds: ['tenant-001'],
      },
    });
  });

  it('constructs an allowlisted identity in test', async () => {
    const result = await verifier(SecurityEnvironment.TEST).verify(
      TOKEN,
      context(SecurityEnvironment.TEST),
    );
    expect(result).toMatchObject({
      success: true,
      identity: { authenticationMethod: ServiceAuthenticationMethod.TEST },
    });
  });

  it('fails closed in production', async () => {
    const result = await verifier(SecurityEnvironment.PRODUCTION).verify(
      TOKEN,
      context(SecurityEnvironment.PRODUCTION),
    );
    expect(result).toMatchObject({
      success: false,
      error: {
        code: ServiceIdentityVerificationErrorCode.UNSUPPORTED_AUTH_METHOD,
      },
    });
  });

  it('rejects a credential for a caller outside the subject allowlist', async () => {
    const configuredVerifier = new DevelopmentServiceIdentityVerifier({
      environment: SecurityEnvironment.TEST,
      credentials: [{ token: TOKEN, subject: 'untrusted-service' }],
    });
    const result = await configuredVerifier.verify(
      TOKEN,
      context(SecurityEnvironment.TEST),
    );
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.CALLER_NOT_ALLOWED },
    });
  });

  it('fails safely when explicit credentials are missing', async () => {
    const result = await new DevelopmentServiceIdentityVerifier({
      environment: SecurityEnvironment.TEST,
      credentials: [],
    }).verify(TOKEN, context(SecurityEnvironment.TEST));
    expect(result).toMatchObject({
      success: false,
      error: {
        code: ServiceIdentityVerificationErrorCode.INTERNAL_IDENTITY_ERROR,
      },
    });
  });
});
