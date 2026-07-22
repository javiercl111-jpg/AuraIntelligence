import { describe, expect, it } from 'vitest';
import {
  ExecutiveDiscoverySecurityConfigError,
  ExecutiveDiscoverySecurityConfigErrorCode,
  loadExecutiveDiscoverySecurityConfig,
} from '../src/config';
import { SecurityEnvironment } from '../src/security';

const SUBJECT = 'control-center-backend';

function validEnvironment(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Readonly<Record<string, string | undefined>> {
  return {
    EIS_SECURITY_ENVIRONMENT: 'test',
    EIS_SECURITY_ALLOWED_ISSUERS: 'development://aura-control-center',
    EIS_SECURITY_ALLOWED_AUDIENCES: 'aura-intelligence',
    EIS_SECURITY_ALLOWED_SUBJECTS: SUBJECT,
    EIS_SECURITY_SUBJECT_TENANT_GRANTS: JSON.stringify({
      [SUBJECT]: ['tenant-001'],
    }),
    EIS_SECURITY_SUBJECT_ORGANIZATION_GRANTS: JSON.stringify({
      [SUBJECT]: ['organization-001'],
    }),
    EIS_SECURITY_SUBJECT_COMPANY_GRANTS: JSON.stringify({
      [SUBJECT]: ['company-001'],
    }),
    EIS_SECURITY_ALLOW_DEVELOPMENT_VERIFIER: 'true',
    EIS_SECURITY_CLOCK_SKEW_SECONDS: '30',
    EIS_SECURITY_TOKEN_MAX_AGE_SECONDS: '300',
    EIS_SECURITY_CLAIMS_VERSION: '1',
    EIS_SECURITY_AUTHORIZATION_HEADER_REQUIRED: 'true',
    EIS_SECURITY_DEVELOPMENT_IDENTITIES: JSON.stringify([
      { token: 'configured-test-token-value', subject: SUBJECT },
    ]),
    ...overrides,
  };
}

describe('loadExecutiveDiscoverySecurityConfig', () => {
  it('loads a typed development/test configuration from server variables', () => {
    expect(loadExecutiveDiscoverySecurityConfig(validEnvironment())).toMatchObject({
      environment: SecurityEnvironment.TEST,
      allowedSubjects: [SUBJECT],
      subjectTenantGrants: { [SUBJECT]: ['tenant-001'] },
      allowDevelopmentVerifier: true,
      authorizationHeaderRequired: true,
    });
  });

  it('rejects the development verifier in production', () => {
    expect(() =>
      loadExecutiveDiscoverySecurityConfig(
        validEnvironment({ EIS_SECURITY_ENVIRONMENT: 'production' }),
      ),
    ).toThrowError(
      new ExecutiveDiscoverySecurityConfigError(
        ExecutiveDiscoverySecurityConfigErrorCode.INVALID_DEVELOPMENT_CONFIG,
      ),
    );
  });

  it('requires an explicit HTTPS JWKS URI and algorithms for OIDC', () => {
    const config = loadExecutiveDiscoverySecurityConfig(
      validEnvironment({
        EIS_SECURITY_ENVIRONMENT: 'production',
        EIS_SECURITY_ALLOW_DEVELOPMENT_VERIFIER: 'false',
        EIS_SECURITY_DEVELOPMENT_IDENTITIES: undefined,
        EIS_SECURITY_OIDC_JWKS_URI: 'https://issuer.example.test/jwks.json',
        EIS_SECURITY_OIDC_ALGORITHMS: 'RS256',
      }),
    );
    expect(config).toMatchObject({
      environment: SecurityEnvironment.PRODUCTION,
      oidcAlgorithms: ['RS256'],
      allowDevelopmentVerifier: false,
    });
  });

  it('fails closed when Authorization is configured as optional', () => {
    expect(() =>
      loadExecutiveDiscoverySecurityConfig(
        validEnvironment({
          EIS_SECURITY_AUTHORIZATION_HEADER_REQUIRED: 'false',
        }),
      ),
    ).toThrowError(
      new ExecutiveDiscoverySecurityConfigError(
        ExecutiveDiscoverySecurityConfigErrorCode.INSECURE_CONFIGURATION,
      ),
    );
  });

  it('does not expose invalid grant values in configuration errors', () => {
    const privateValue = 'private-tenant-value';
    let captured: unknown;
    try {
      loadExecutiveDiscoverySecurityConfig(
        validEnvironment({
          EIS_SECURITY_SUBJECT_TENANT_GRANTS: JSON.stringify({
            unexpectedSubject: [privateValue],
          }),
        }),
      );
    } catch (error: unknown) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(ExecutiveDiscoverySecurityConfigError);
    expect(String(captured)).not.toContain(privateValue);
    expect(String(captured)).not.toContain('unexpectedSubject');
  });
});
