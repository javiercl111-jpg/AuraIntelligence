export type AuraGrowthIdentityStatus =
  | 'active'
  | 'inactive'
  | 'suspended';

export interface AuraGrowthIdentityRecord {
  readonly uid: string;
  readonly companyId: string;
  readonly status: AuraGrowthIdentityStatus;
  readonly email?: string;
  readonly displayName?: string;
}

export interface FirebaseIdentityInput {
  readonly uid:
    | string
    | undefined
    | null;
  readonly email?:
    | string
    | undefined
    | null;
  readonly displayName?:
    | string
    | undefined
    | null;
}

export type GrowthIdentityResolutionReason =
  | 'resolved'
  | 'missing_firebase_uid'
  | 'missing_identity_record'
  | 'uid_mismatch'
  | 'missing_company'
  | 'identity_inactive';

export interface GrowthIdentityResolutionResult {
  readonly resolved: boolean;
  readonly reason: GrowthIdentityResolutionReason;
  readonly userId?: string;
  readonly companyId?: string;
  readonly email?: string;
  readonly displayName?: string;
}

const normalizeRequired = (
  value:
    | string
    | undefined
    | null,
): string =>
  typeof value === 'string'
    ? value.trim()
    : '';

const normalizeOptional = (
  value:
    | string
    | undefined
    | null,
): string | undefined => {
  const normalized =
    normalizeRequired(value);

  return normalized || undefined;
};

export const resolveGrowthIdentity = ({
  firebaseIdentity,
  identityRecord,
}: {
  readonly firebaseIdentity:
    FirebaseIdentityInput;
  readonly identityRecord:
    | AuraGrowthIdentityRecord
    | undefined
    | null;
}): GrowthIdentityResolutionResult => {
  const firebaseUid =
    normalizeRequired(
      firebaseIdentity.uid,
    );

  if (!firebaseUid) {
    return {
      resolved: false,
      reason: 'missing_firebase_uid',
    };
  }

  if (!identityRecord) {
    return {
      resolved: false,
      reason: 'missing_identity_record',
      userId: firebaseUid,
    };
  }

  const recordUid =
    normalizeRequired(
      identityRecord.uid,
    );

  if (
    !recordUid ||
    recordUid !== firebaseUid
  ) {
    return {
      resolved: false,
      reason: 'uid_mismatch',
      userId: firebaseUid,
    };
  }

  const companyId =
    normalizeRequired(
      identityRecord.companyId,
    );

  if (!companyId) {
    return {
      resolved: false,
      reason: 'missing_company',
      userId: firebaseUid,
    };
  }

  if (
    identityRecord.status !== 'active'
  ) {
    return {
      resolved: false,
      reason: 'identity_inactive',
      userId: firebaseUid,
      companyId,
    };
  }

  return {
    resolved: true,
    reason: 'resolved',
    userId: firebaseUid,
    companyId,
    email:
      normalizeOptional(
        identityRecord.email,
      ) ??
      normalizeOptional(
        firebaseIdentity.email,
      ),
    displayName:
      normalizeOptional(
        identityRecord.displayName,
      ) ??
      normalizeOptional(
        firebaseIdentity.displayName,
      ),
  };
};
