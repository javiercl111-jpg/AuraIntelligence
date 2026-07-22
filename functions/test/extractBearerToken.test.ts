import { describe, expect, it } from 'vitest';
import {
  extractBearerToken,
  ServiceIdentityVerificationErrorCode,
} from '../src/security';

describe('extractBearerToken', () => {
  it('extracts a valid Bearer token case-insensitively', () => {
    expect(extractBearerToken('bEaReR signed.jwt.value')).toEqual({
      success: true,
      token: 'signed.jwt.value',
    });
  });

  it('rejects a missing header', () => {
    expect(extractBearerToken(undefined)).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.MISSING_AUTHORIZATION },
    });
  });

  it('rejects a non-Bearer scheme', () => {
    expect(extractBearerToken('Basic abc123')).toMatchObject({
      success: false,
      error: {
        code:
          ServiceIdentityVerificationErrorCode.INVALID_AUTHORIZATION_SCHEME,
      },
    });
  });

  it('rejects an empty token', () => {
    expect(extractBearerToken('Bearer   ')).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_TOKEN },
    });
  });

  it('accepts harmless surrounding and separator whitespace', () => {
    expect(extractBearerToken('  Bearer\t signed.jwt.value  ')).toEqual({
      success: true,
      token: 'signed.jwt.value',
    });
  });

  it.each([
    ['Bearer first, Bearer second'],
    [['Bearer first', 'Bearer second'] as const],
    ['Bearer first second'],
  ])('rejects ambiguous values without reflecting their contents', (header) => {
    const result = extractBearerToken(header);
    expect(result).toMatchObject({
      success: false,
      error: { code: ServiceIdentityVerificationErrorCode.INVALID_TOKEN },
    });
    expect(JSON.stringify(result)).not.toContain('first');
    expect(JSON.stringify(result)).not.toContain('second');
  });
});
