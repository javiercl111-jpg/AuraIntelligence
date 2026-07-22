import {
  identityVerificationFailure,
  ServiceIdentityVerificationErrorCode,
} from './ServiceIdentityVerificationResult';

export interface BearerTokenExtractionSuccess {
  readonly success: true;
  readonly token: string;
}

export type BearerTokenExtractionResult =
  | BearerTokenExtractionSuccess
  | ReturnType<typeof identityVerificationFailure>;

export function extractBearerToken(
  authorizationHeader: string | readonly string[] | undefined,
): BearerTokenExtractionResult {
  if (authorizationHeader === undefined) {
    return identityVerificationFailure(
      ServiceIdentityVerificationErrorCode.MISSING_AUTHORIZATION,
    );
  }

  if (
    typeof authorizationHeader !== 'string' ||
    authorizationHeader.includes(',')
  ) {
    return identityVerificationFailure(
      ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
    );
  }

  const match = /^\s*([^\s]+)(?:[\t ]+(.*?))?\s*$/.exec(authorizationHeader);
  if (match === null || match[1].toLowerCase() !== 'bearer') {
    return identityVerificationFailure(
      ServiceIdentityVerificationErrorCode.INVALID_AUTHORIZATION_SCHEME,
    );
  }

  const token = match[2]?.trim() ?? '';
  if (token.length === 0 || /\s/.test(token)) {
    return identityVerificationFailure(
      ServiceIdentityVerificationErrorCode.INVALID_TOKEN,
    );
  }

  return { success: true, token };
}
