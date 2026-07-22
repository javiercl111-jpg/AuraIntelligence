import {
  generateKeyPair,
  SignJWT,
  type JWTVerifyGetKey,
} from 'jose';
import { describe, expect, it } from 'vitest';
import {
  JoseOidcTokenVerifier,
  OidcServiceIdentityVerifier,
  OidcTokenVerificationErrorCode,
  SecurityEnvironment,
  ServiceIdentityVerificationErrorCode,
  type OidcTokenVerifier,
  type ServiceIdentityVerificationContext,
} from '../src/security';

const NOW = 1_000;
const SUBJECT = 'control-center-backend';

const context: ServiceIdentityVerificationContext = {
  allowedIssuers: ['https://issuer.example.test'],
  allowedAudiences: ['aura-intelligence'],
  allowedSubjects: [SUBJECT],
  environment: SecurityEnvironment.TEST,
  subjectTenantGrants: { [SUBJECT]: ['tenant-001'] },
  subjectOrganizationGrants: { [SUBJECT]: ['organization-001'] },
  subjectCompanyGrants: { [SUBJECT]: ['company-001'] },
  clockSkewSeconds: 10,
  tokenMaxAgeSeconds: 300,
  claimsVersion: '1',
};

function validClaims(): Readonly<Record<string, unknown>> {
  return {
    iss: 'https://issuer.example.test',
    aud: 'aura-intelligence',
    sub: SUBJECT,
    iat: NOW - 30,
    exp: NOW + 60,
    jti: 'token-001',
    environment: SecurityEnvironment.TEST,
    claims_version: '1',
  };
}

function claimsVerifier(
  claims: Readonly<Record<string, unknown>>,
): OidcTokenVerifier {
  return { verify: async () => ({ success: true, claims }) };
}

async function verifyClaims(claims: Readonly<Record<string, unknown>>) {
  return new OidcServiceIdentityVerifier(claimsVerifier(claims), {
    nowEpochSeconds: () => NOW,
  }).verify('cryptographically-verified-token', context);
}

describe('OidcServiceIdentityVerifier', () => {
  it('builds a tenant-aware identity from a valid verified token', async () => {
    const result = await verifyClaims(validClaims());

    expect(result).toEqual({
      success: true,
      identity: {
        subject: SUBJECT,
        issuer: 'https://issuer.example.test',
        audience: ['aura-intelligence'],
        authenticationMethod: 'OIDC',
        environment: SecurityEnvironment.TEST,
        authorizedTenantIds: ['tenant-001'],
        authorizedOrganizationIds: ['organization-001'],
        authorizedCompanyIds: ['company-001'],
        issuedAt: NOW - 30,
        expiresAt: NOW + 60,
        tokenId: 'token-001',
        claimsVersion: '1',
      },
    });
  });

  it('maps signature verification failure to INVALID_TOKEN', async () => {
    const tokenVerifier: OidcTokenVerifier = {
      verify: async () => ({
        success: false,
        errorCode: OidcTokenVerificationErrorCode.INVALID_TOKEN,
      }),
    };
    const result = await new OidcServiceIdentityVerifier(tokenVerifier, {
      nowEpochSeconds: () => NOW,
    }).verify('invalid-signature', context);

    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_TOKEN },
    });
  });

  it('rejects an issuer outside the exact allowlist', async () => {
    const result = await verifyClaims({
      ...validClaims(),
      iss: 'https://issuer.example.test.attacker.invalid',
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_ISSUER },
    });
  });

  it('rejects an audience outside the exact allowlist', async () => {
    const result = await verifyClaims({
      ...validClaims(),
      aud: 'aura-intelligence-admin',
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_AUDIENCE },
    });
  });

  it('rejects a missing subject', async () => {
    const { sub: omitted, ...claims } = validClaims();
    expect(omitted).toBe(SUBJECT);
    const result = await verifyClaims(claims);
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_TOKEN },
    });
  });

  it('rejects an expired token with injected time and skew', async () => {
    const result = await verifyClaims({ ...validClaims(), exp: NOW - 11 });
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.TOKEN_EXPIRED },
    });
  });

  it('rejects iat in the future beyond clock skew', async () => {
    const result = await verifyClaims({ ...validClaims(), iat: NOW + 11 });
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_TOKEN },
    });
  });

  it('rejects a token older than the configured maximum age', async () => {
    const result = await verifyClaims({ ...validClaims(), iat: NOW - 311 });
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_TOKEN },
    });
  });

  it('rejects a caller outside the exact subject allowlist', async () => {
    const result = await verifyClaims({
      ...validClaims(),
      sub: `${SUBJECT}-admin`,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.CALLER_NOT_ALLOWED },
    });
  });
});
describe('JoseOidcTokenVerifier', () => {
  it('verifies a real local signature and rejects a tampered signature', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const keyResolver: JWTVerifyGetKey = async () => publicKey;
    const verifier = new JoseOidcTokenVerifier(keyResolver, ['RS256']);
    const token = await new SignJWT({
      environment: SecurityEnvironment.TEST,
      claims_version: '1',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'local-test-key' })
      .setIssuer('https://issuer.example.test')
      .setAudience('aura-intelligence')
      .setSubject(SUBJECT)
      .setIssuedAt(NOW - 30)
      .setExpirationTime(NOW + 60)
      .sign(privateKey);

    await expect(
      verifier.verify(token, {
        allowedIssuers: context.allowedIssuers,
        allowedAudiences: context.allowedAudiences,
        nowEpochSeconds: NOW,
        clockSkewSeconds: context.clockSkewSeconds,
      }),
    ).resolves.toMatchObject({ success: true });

    const segments = token.split('.');
    const signature = segments[2];
    segments[2] = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
    await expect(
      verifier.verify(segments.join('.'), {
        allowedIssuers: context.allowedIssuers,
        allowedAudiences: context.allowedAudiences,
        nowEpochSeconds: NOW,
        clockSkewSeconds: context.clockSkewSeconds,
      }),
    ).resolves.toEqual({
      success: false,
      errorCode: OidcTokenVerificationErrorCode.INVALID_TOKEN,
    });
  });
});
