import {
  resolveGrowthIdentity,
  type AuraGrowthIdentityRecord,
  type FirebaseIdentityInput,
  type GrowthIdentityResolutionReason,
} from './growthIdentity';

import {
  authorizeGrowthProduct,
  type AuraProductEntitlement,
  type GrowthAuthorizationReason,
  type GrowthProductRole,
  type GrowthUserMembership,
} from './growthProductEntitlement';

export type GrowthAccessDenialReason =
  | GrowthIdentityResolutionReason
  | GrowthAuthorizationReason;

export interface GrowthAccessAuthorityInput {
  readonly firebaseIdentity:
    FirebaseIdentityInput;
  readonly identityRecord:
    | AuraGrowthIdentityRecord
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

export interface GrowthAccessAuthorityResult {
  readonly allowed: boolean;
  readonly reason: GrowthAccessDenialReason;
  readonly userId?: string;
  readonly companyId?: string;
  readonly role?: GrowthProductRole;
  readonly email?: string;
  readonly displayName?: string;
}

export const resolveGrowthAccess = (
  input: GrowthAccessAuthorityInput,
): GrowthAccessAuthorityResult => {
  const identity =
    resolveGrowthIdentity({
      firebaseIdentity:
        input.firebaseIdentity,
      identityRecord:
        input.identityRecord,
    });

  if (!identity.resolved) {
    return {
      allowed: false,
      reason: identity.reason,
      userId: identity.userId,
      companyId: identity.companyId,
    };
  }

  const authorization =
    authorizeGrowthProduct({
      userId: identity.userId,
      companyId: identity.companyId,
      entitlement: input.entitlement,
      membership: input.membership,
    });

  if (!authorization.allowed) {
    return {
      allowed: false,
      reason: authorization.reason,
      userId: identity.userId,
      companyId: identity.companyId,
    };
  }

  return {
    allowed: true,
    reason: 'authorized',
    userId: identity.userId,
    companyId: identity.companyId,
    role: authorization.role,
    email: identity.email,
    displayName: identity.displayName,
  };
};
