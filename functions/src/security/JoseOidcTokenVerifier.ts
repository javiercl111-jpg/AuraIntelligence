import {
  errors,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import {
  OidcTokenVerificationErrorCode,
  type OidcTokenVerificationOptions,
  type OidcTokenVerificationResult,
  type OidcTokenVerifier,
} from './OidcTokenVerifier';

function mapJoseError(error: unknown): OidcTokenVerificationErrorCode {
  if (error instanceof errors.JWTExpired) {
    return OidcTokenVerificationErrorCode.TOKEN_EXPIRED;
  }

  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === 'iss') {
      return OidcTokenVerificationErrorCode.INVALID_ISSUER;
    }
    if (error.claim === 'aud') {
      return OidcTokenVerificationErrorCode.INVALID_AUDIENCE;
    }
    if (error.claim === 'exp') {
      return OidcTokenVerificationErrorCode.TOKEN_EXPIRED;
    }
    return OidcTokenVerificationErrorCode.INVALID_TOKEN;
  }

  if (error instanceof errors.JOSEError) {
    return OidcTokenVerificationErrorCode.INVALID_TOKEN;
  }

  return OidcTokenVerificationErrorCode.INTERNAL_ERROR;
}

export class JoseOidcTokenVerifier implements OidcTokenVerifier {
  public constructor(
    private readonly keyResolver: JWTVerifyGetKey,
    private readonly allowedAlgorithms: readonly string[],
  ) {}

  public async verify(
    token: string,
    options: OidcTokenVerificationOptions,
  ): Promise<OidcTokenVerificationResult> {
    try {
      const result = await jwtVerify(token, this.keyResolver, {
        algorithms: [...this.allowedAlgorithms],
        issuer: [...options.allowedIssuers],
        audience: [...options.allowedAudiences],
        currentDate: new Date(options.nowEpochSeconds * 1_000),
        clockTolerance: options.clockSkewSeconds,
      });

      return { success: true, claims: result.payload };
    } catch (error: unknown) {
      return { success: false, errorCode: mapJoseError(error) };
    }
  }
}
