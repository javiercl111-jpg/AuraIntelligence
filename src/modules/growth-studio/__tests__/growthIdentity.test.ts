import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveGrowthIdentity,
  type AuraGrowthIdentityRecord,
} from '../product/growthIdentity';

const record = (
  overrides:
    Partial<AuraGrowthIdentityRecord> = {},
): AuraGrowthIdentityRecord => ({
  uid: 'firebase-user-001',
  companyId: 'company-001',
  status: 'active',
  email: 'user@company.test',
  displayName: 'Growth User',
  ...overrides,
});

describe(
  'Growth UID-first identity resolver',
  () => {
    it('resolves an active identity by matching Firebase UID', () => {
      expect(
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: 'firebase-user-001',
            email: 'auth@company.test',
          },
          identityRecord: record(),
        }),
      ).toEqual({
        resolved: true,
        reason: 'resolved',
        userId: 'firebase-user-001',
        companyId: 'company-001',
        email: 'user@company.test',
        displayName: 'Growth User',
      });
    });

    it('does not use email as identity authority', () => {
      expect(
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: 'different-firebase-user',
            email: 'user@company.test',
          },
          identityRecord: record(),
        }).reason,
      ).toBe('uid_mismatch');
    });

    it('fails closed when Firebase UID is missing', () => {
      expect(
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: undefined,
            email: 'user@company.test',
          },
          identityRecord: record(),
        }).reason,
      ).toBe('missing_firebase_uid');
    });

    it('fails closed when the Aura identity record is missing', () => {
      expect(
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: 'firebase-user-001',
          },
          identityRecord: null,
        }).reason,
      ).toBe('missing_identity_record');
    });

    it('fails closed when the persisted UID differs', () => {
      expect(
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: 'firebase-user-001',
          },
          identityRecord: record({
            uid: 'firebase-user-002',
          }),
        }).reason,
      ).toBe('uid_mismatch');
    });

    it('fails closed when company authority is missing', () => {
      expect(
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: 'firebase-user-001',
          },
          identityRecord: record({
            companyId: '',
          }),
        }).reason,
      ).toBe('missing_company');
    });

    it.each([
      'inactive',
      'suspended',
    ] as const)(
      'fails closed for %s identity',
      (status) => {
        expect(
          resolveGrowthIdentity({
            firebaseIdentity: {
              uid: 'firebase-user-001',
            },
            identityRecord: record({
              status,
            }),
          }).reason,
        ).toBe('identity_inactive');
      },
    );

    it('uses Firebase email only as fallback presentation data', () => {
      const result =
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: 'firebase-user-001',
            email: 'firebase@company.test',
            displayName:
              'Firebase User',
          },
          identityRecord: record({
            email: undefined,
            displayName: undefined,
          }),
        });

      expect(result.resolved).toBe(true);
      expect(result.email).toBe(
        'firebase@company.test',
      );
      expect(result.displayName).toBe(
        'Firebase User',
      );
    });

    it('normalizes UID and company whitespace without changing authority', () => {
      const result =
        resolveGrowthIdentity({
          firebaseIdentity: {
            uid: ' firebase-user-001 ',
          },
          identityRecord: record({
            uid: 'firebase-user-001',
            companyId: ' company-001 ',
          }),
        });

      expect(result).toMatchObject({
        resolved: true,
        userId: 'firebase-user-001',
        companyId: 'company-001',
      });
    });
  },
);
