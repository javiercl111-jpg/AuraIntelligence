import { describe, expect, it } from 'vitest';
import {
  SecurityEnvironment,
  ServiceAuthenticationMethod,
  ServiceAuthorizationErrorCode,
  ServiceAuthorizationPolicy,
  type ServiceIdentity,
} from '../src/security';

const SUBJECT = 'control-center-backend';

function identity(overrides: Partial<ServiceIdentity> = {}): ServiceIdentity {
  return {
    subject: SUBJECT,
    issuer: 'https://issuer.example.test',
    audience: ['aura-intelligence'],
    authenticationMethod: ServiceAuthenticationMethod.OIDC,
    environment: SecurityEnvironment.TEST,
    authorizedTenantIds: ['tenant-001'],
    authorizedOrganizationIds: ['organization-001'],
    authorizedCompanyIds: ['company-001'],
    claimsVersion: '1',
    ...overrides,
  };
}

const policy = new ServiceAuthorizationPolicy({
  allowedSubjects: [SUBJECT],
  environment: SecurityEnvironment.TEST,
  claimsVersion: '1',
});

const target = {
  tenantId: 'tenant-001',
  organizationId: 'organization-001',
  companyId: 'company-001',
};

describe('ServiceAuthorizationPolicy', () => {
  it('allows exact tenant, organization, and company grants', () => {
    expect(policy.authorize(identity(), target)).toEqual({ allowed: true });
  });

  it('rejects a manipulated tenant without partial matching', () => {
    expect(
      policy.authorize(identity(), { ...target, tenantId: 'tenant-001-admin' }),
    ).toMatchObject({
      allowed: false,
      error: { code: ServiceAuthorizationErrorCode.TENANT_NOT_AUTHORIZED },
    });
  });

  it('allows an exact organization grant', () => {
    expect(
      policy.authorize(
        identity({ authorizedOrganizationIds: ['organization-001'] }),
        target,
      ),
    ).toEqual({ allowed: true });
  });

  it('rejects a manipulated organization', () => {
    expect(
      policy.authorize(identity(), {
        ...target,
        organizationId: 'organization-001-child',
      }),
    ).toMatchObject({
      allowed: false,
      error: {
        code: ServiceAuthorizationErrorCode.ORGANIZATION_NOT_AUTHORIZED,
      },
    });
  });

  it('allows an exact company grant', () => {
    expect(
      policy.authorize(
        identity({ authorizedCompanyIds: ['company-001'] }),
        target,
      ),
    ).toEqual({ allowed: true });
  });

  it('rejects a company outside the identity grants', () => {
    expect(
      policy.authorize(identity(), { ...target, companyId: 'company-002' }),
    ).toMatchObject({
      allowed: false,
      error: { code: ServiceAuthorizationErrorCode.COMPANY_NOT_AUTHORIZED },
    });
  });

  it('rejects an unsupported claims version', () => {
    expect(
      policy.authorize(identity({ claimsVersion: '2' }), target),
    ).toMatchObject({
      allowed: false,
      error: {
        code: ServiceAuthorizationErrorCode.CLAIMS_VERSION_UNSUPPORTED,
      },
    });
  });

  it('rejects an identity from a different environment', () => {
    expect(
      policy.authorize(
        identity({ environment: SecurityEnvironment.PRODUCTION }),
        target,
      ),
    ).toMatchObject({
      allowed: false,
      error: {
        code: ServiceAuthorizationErrorCode.ENVIRONMENT_NOT_AUTHORIZED,
      },
    });
  });

  it('rejects a subject outside the policy allowlist', () => {
    expect(
      policy.authorize(identity({ subject: `${SUBJECT}-admin` }), target),
    ).toMatchObject({
      allowed: false,
      error: { code: ServiceAuthorizationErrorCode.SUBJECT_NOT_AUTHORIZED },
    });
  });
});
