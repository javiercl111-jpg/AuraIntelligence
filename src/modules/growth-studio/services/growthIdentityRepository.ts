import {
  doc,
  getDoc,
} from 'firebase/firestore';

import { db } from '../../../firebase';

import type {
  AuraGrowthIdentityRecord,
  AuraGrowthIdentityStatus,
} from '../product/growthIdentity';

const GROWTH_IDENTITIES_COLLECTION =
  'growth_identities';

const identityCache = new Map<
  string,
  Promise<AuraGrowthIdentityRecord | null>
>();

const normalizeRequired = (
  value: unknown,
): string =>
  typeof value === 'string'
    ? value.trim()
    : '';

const isIdentityStatus = (
  value: unknown,
): value is AuraGrowthIdentityStatus =>
  value === 'active' ||
  value === 'inactive' ||
  value === 'suspended';

const readIdentity = async (
  uid: string,
): Promise<AuraGrowthIdentityRecord | null> => {
  const snapshot = await getDoc(
    doc(
      db,
      GROWTH_IDENTITIES_COLLECTION,
      uid,
    ),
  );

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  const recordUid =
    normalizeRequired(data.uid);

  const companyId =
    normalizeRequired(data.companyId);

  if (
    recordUid !== uid ||
    !companyId ||
    !isIdentityStatus(data.status)
  ) {
    return null;
  }

  return {
    uid: recordUid,
    companyId,
    status: data.status,
    email:
      normalizeRequired(data.email) ||
      undefined,
    displayName:
      normalizeRequired(data.displayName) ||
      undefined,
  };
};

export const getGrowthIdentity = (
  uid: string,
): Promise<AuraGrowthIdentityRecord | null> => {
  const normalizedUid =
    normalizeRequired(uid);

  if (!normalizedUid) {
    return Promise.resolve(null);
  }

  const cached =
    identityCache.get(normalizedUid);

  if (cached) {
    return cached;
  }

  const request =
    readIdentity(normalizedUid).catch(
      (error: unknown) => {
        identityCache.delete(normalizedUid);
        throw error;
      },
    );

  identityCache.set(
    normalizedUid,
    request,
  );

  return request;
};

export const clearGrowthIdentityCache = (
  uid?: string,
): void => {
  const normalizedUid =
    normalizeRequired(uid);

  if (normalizedUid) {
    identityCache.delete(normalizedUid);
    return;
  }

  identityCache.clear();
};