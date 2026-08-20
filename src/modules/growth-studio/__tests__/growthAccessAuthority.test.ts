import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolveGrowthAccess,
} from '../product/growthAccessAuthority';

import type {
  AuraGrowthIdentityRecord,
} from '../product/growthIdentity';

import type {
  AuraProductEntitlement,
  GrowthUserMembership,
} from '../product/growthProductEntitlement';

const identityRecord = (
  overrides:
    Partial<AuraGrowthIdentityRecord> = {},
): AuraGrowthIdentityRecord => ({
  uid: 'user-001',
  companyId: 'company-001',
  status: 'active',
  email: 'user@company.test',
  displayName: 'Growth User',
  ...overrides,
});

const entitlement = (
  overrides:
    Partial<AuraProductEntitlement> = {},
): AuraProductEntitlement => ({
  companyId: 'company-001',
  productId: 'growth',
  status: 'active',
  ...overrides,
});

const membership = (
  overrides:
    Partial<GrowthUserMembership> = {},
): GrowthUserMembership => ({
  userId: 'user-001',
  companyId: 'company-001',
  status: 'active',
  role: 'admin',
  ...overrides,
});

const authorizedInput = () => ({
  firebaseIdentity: {
    uid: 'user-001',
    email: 'firebase@company.test',
  },
  identityRecord: identityRecord(),
  entitlement: entitlement(),
  membership: membership(),
});

describe(
  'Unified Growth access authority',
  () => {
    it('authorizes only when identity, entitlement and membership all authorize', () => {
      expect(
        resolveGrowthAccess(
          authorizedInput(),
        ),
      ).toEqual({
        allowed: true,
        reason: 'authorized',
        userId: 'user-001',
        companyId: 'company-001',
        role: 'admin',
        email: 'user@company.test',
        displayName: 'Growth User',
      });
    });

    it('fails closed before authorization when Firebase UID is missing', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          firebaseIdentity: {
            uid: undefined,
          },
        }).reason,
      ).toBe('missing_firebase_uid');
    });

    it('fails closed when Aura identity is absent', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          identityRecord: null,
        }).reason,
      ).toBe('missing_identity_record');
    });

    it('fails closed when identity is suspended', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          identityRecord:
            identityRecord({
              status: 'suspended',
            }),
        }).reason,
      ).toBe('identity_inactive');
    });

    it('fails closed when Growth entitlement is absent', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          entitlement: null,
        }).reason,
      ).toBe('missing_entitlement');
    });

    it('fails closed when entitlement belongs to another Aura product', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          entitlement:
            entitlement({
              productId: 'intelligence',
            }),
        }).reason,
      ).toBe('wrong_product');
    });

    it('fails closed when Growth entitlement is suspended', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          entitlement:
            entitlement({
              status: 'suspended',
            }),
        }).reason,
      ).toBe('entitlement_inactive');
    });

    it('fails closed when membership is absent', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          membership: null,
        }).reason,
      ).toBe('missing_membership');
    });

    it('fails closed when membership is inactive', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          membership:
            membership({
              status: 'inactive',
            }),
        }).reason,
      ).toBe('membership_inactive');
    });

    it('fails closed when identity and entitlement company differ', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          entitlement:
            entitlement({
              companyId: 'company-002',
            }),
        }).reason,
      ).toBe('company_mismatch');
    });

    it('fails closed when membership belongs to another user', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          membership:
            membership({
              userId: 'user-002',
            }),
        }).reason,
      ).toBe('company_mismatch');
    });

    it('propagates the authorized Growth role', () => {
      expect(
        resolveGrowthAccess({
          ...authorizedInput(),
          membership:
            membership({
              role: 'viewer',
            }),
        }).role,
      ).toBe('viewer');
    });
  },
);
