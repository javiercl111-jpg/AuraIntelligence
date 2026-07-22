export const OidcTokenVerificationErrorCode = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_ISSUER: 'INVALID_ISSUER',
  INVALID_AUDIENCE: 'INVALID_AUDIENCE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type OidcTokenVerificationErrorCode =
  (typeof OidcTokenVerificationErrorCode)[keyof typeof OidcTokenVerificationErrorCode];

export interface OidcTokenVerificationOptions {
  readonly allowedIssuers: readonly string[];
  readonly allowedAudiences: readonly string[];
  readonly nowEpochSeconds: number;
  readonly clockSkewSeconds: number;
}

export interface OidcTokenVerificationSuccess {
  readonly success: true;
  readonly claims: Readonly<Record<string, unknown>>;
}

export interface OidcTokenVerificationFailure {
  readonly success: false;
  readonly errorCode: OidcTokenVerificationErrorCode;
}

export type OidcTokenVerificationResult =
  | OidcTokenVerificationSuccess
  | OidcTokenVerificationFailure;

export interface OidcTokenVerifier {
  readonly verify: (
    token: string,
    options: OidcTokenVerificationOptions,
  ) => Promise<OidcTokenVerificationResult>;
}
