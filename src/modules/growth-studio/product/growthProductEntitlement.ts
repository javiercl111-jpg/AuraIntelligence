export type AuraProductId =
  | 'growth'
  | 'hcm'
  | 'maintenance'
  | 'signature'
  | 'intelligence';

export type AuraProductEntitlementStatus =
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked';

export type GrowthMembershipStatus =
  | 'active'
  | 'inactive'
  | 'suspended';

export type GrowthProductRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'editor'
  | 'viewer';

export interface AuraProductEntitlement {
  readonly companyId: string;
  readonly productId: AuraProductId;
  readonly status: AuraProductEntitlementStatus;
}

export interface GrowthUserMembership {
  readonly userId: string;
  readonly companyId: string;
  readonly status: GrowthMembershipStatus;
  readonly role: GrowthProductRole;
}

export type GrowthAuthorizationReason =
  | 'authorized'
  | 'missing_identity'
  | 'missing_company'
  | 'missing_entitlement'
  | 'wrong_product'
  | 'entitlement_inactive'
  | 'missing_membership'
  | 'membership_inactive'
  | 'company_mismatch';

export interface GrowthAuthorizationInput {
  readonly userId:
    | string
    | undefined
    | null;
  readonly companyId:
    | string
    | undefined
    | null;
  readonly entitlement:
    | AuraProductEntitlement
    | undefined
    | null;
  readonly membership:
    | GrowthUserMembership
    | undefined
    | null;
}

export interface GrowthAuthorizationResult {
  readonly allowed: boolean;
  readonly reason: GrowthAuthorizationReason;
  readonly companyId?: string;
  readonly userId?: string;
  readonly role?: GrowthProductRole;
}

const hasValue = (
  value:
    | string
    | undefined
    | null,
): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0;

export const authorizeGrowthProduct = (
  input: GrowthAuthorizationInput,
): GrowthAuthorizationResult => {
  if (!hasValue(input.userId)) {
    return {
      allowed: false,
      reason: 'missing_identity',
    };
  }

  if (!hasValue(input.companyId)) {
    return {
      allowed: false,
      reason: 'missing_company',
      userId: input.userId,
    };
  }

  if (!input.entitlement) {
    return {
      allowed: false,
      reason: 'missing_entitlement',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  if (input.entitlement.productId !== 'growth') {
    return {
      allowed: false,
      reason: 'wrong_product',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  if (
    input.entitlement.companyId !==
    input.companyId
  ) {
    return {
      allowed: false,
      reason: 'company_mismatch',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  if (
    input.entitlement.status !== 'active'
  ) {
    return {
      allowed: false,
      reason: 'entitlement_inactive',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  if (!input.membership) {
    return {
      allowed: false,
      reason: 'missing_membership',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  if (
    input.membership.userId !== input.userId ||
    input.membership.companyId !==
      input.companyId
  ) {
    return {
      allowed: false,
      reason: 'company_mismatch',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  if (
    input.membership.status !== 'active'
  ) {
    return {
      allowed: false,
      reason: 'membership_inactive',
      userId: input.userId,
      companyId: input.companyId,
    };
  }

  return {
    allowed: true,
    reason: 'authorized',
    userId: input.userId,
    companyId: input.companyId,
    role: input.membership.role,
  };
};
