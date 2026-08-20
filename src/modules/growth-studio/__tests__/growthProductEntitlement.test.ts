import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  authorizeGrowthProduct,
  type AuraProductEntitlement,
  type GrowthUserMembership,
} from '../product/growthProductEntitlement';

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

describe(
  'Growth product authorization',
  () => {
    it('authorizes an active Growth company entitlement and active membership', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: entitlement(),
          membership: membership(),
        }),
      ).toEqual({
        allowed: true,
        reason: 'authorized',
        userId: 'user-001',
        companyId: 'company-001',
        role: 'admin',
      });
    });

    it('fails closed when identity is missing', () => {
      expect(
        authorizeGrowthProduct({
          userId: undefined,
          companyId: 'company-001',
          entitlement: entitlement(),
          membership: membership(),
        }).reason,
      ).toBe('missing_identity');
    });

    it('fails closed when company is missing', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: undefined,
          entitlement: entitlement(),
          membership: membership(),
        }).reason,
      ).toBe('missing_company');
    });

    it('fails closed when Growth entitlement is missing', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: null,
          membership: membership(),
        }).reason,
      ).toBe('missing_entitlement');
    });

    it('rejects another Aura product entitlement', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: entitlement({
            productId: 'intelligence',
          }),
          membership: membership(),
        }).reason,
      ).toBe('wrong_product');
    });

    it.each([
      'suspended',
      'expired',
      'revoked',
    ] as const)(
      'rejects %s Growth entitlement',
      (status) => {
        expect(
          authorizeGrowthProduct({
            userId: 'user-001',
            companyId: 'company-001',
            entitlement: entitlement({
              status,
            }),
            membership: membership(),
          }).reason,
        ).toBe('entitlement_inactive');
      },
    );

    it('fails closed when membership is missing', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: entitlement(),
          membership: null,
        }).reason,
      ).toBe('missing_membership');
    });

    it.each([
      'inactive',
      'suspended',
    ] as const)(
      'rejects %s Growth membership',
      (status) => {
        expect(
          authorizeGrowthProduct({
            userId: 'user-001',
            companyId: 'company-001',
            entitlement: entitlement(),
            membership: membership({
              status,
            }),
          }).reason,
        ).toBe('membership_inactive');
      },
    );

    it('rejects entitlement from another company', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: entitlement({
            companyId: 'company-002',
          }),
          membership: membership(),
        }).reason,
      ).toBe('company_mismatch');
    });

    it('rejects membership from another company', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: entitlement(),
          membership: membership({
            companyId: 'company-002',
          }),
        }).reason,
      ).toBe('company_mismatch');
    });

    it('rejects membership belonging to another user', () => {
      expect(
        authorizeGrowthProduct({
          userId: 'user-001',
          companyId: 'company-001',
          entitlement: entitlement(),
          membership: membership({
            userId: 'user-002',
          }),
        }).reason,
      ).toBe('company_mismatch');
    });
  },
);
