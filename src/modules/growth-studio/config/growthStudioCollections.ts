// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Firestore Collection Constants
// ─────────────────────────────────────────────────────────────

import type { GrowthCommercialScope } from '../services/contracts/IGrowthCommercialContextRepository';

/**
 * Firestore collection names for Growth Studio entities.
 *
 * Path authority only; importing this module performs no storage operations.
 */
export const GROWTH_COLLECTIONS = {
  /** Executive growth conversations. */
  CONVERSATIONS: 'growth_conversations',

  /** Growth objectives extracted from conversations. */
  OBJECTIVES: 'growth_objectives',

  /** Generated growth campaigns. */
  CAMPAIGNS: 'growth_campaigns',

  /** Brand Brain profiles per company. */
  BRAND_BRAIN_PROFILES: 'brand_brain_profiles',

  /** Approval records for campaigns and content. */
  APPROVALS: 'growth_approvals',

  /** Audit log of all Growth Studio operations. */
  AUDIT_LOG: 'growth_audit_log',

  /** Commercial contexts, partitioned independently by tenant and company. */
  COMMERCIAL_CONTEXTS: 'growth_commercial_contexts',
} as const;

/**
 * Type helper for collection name values.
 */
export type GrowthCollectionName =
  (typeof GROWTH_COLLECTIONS)[keyof typeof GROWTH_COLLECTIONS];

export default GROWTH_COLLECTIONS;

export const GROWTH_COMMERCIAL_SUBCOLLECTIONS = {
  COMPANIES: 'companies',
  PRODUCTS: 'products',
} as const;

/**
 * Local Growth design, not a global collection convention:
 * growth_commercial_contexts/{tenant}/companies/{company} is the enterprise doc;
 * its products/{product} subcollection holds stable product documents.
 * Parent tenant documents need not exist. Scope segments are encoded separately,
 * never joined into an ambiguous composite id or inferred from one another.
 */
export function growthCommercialIdSegment(id: string): string {
  if (typeof id !== 'string' || !id.trim() || id.trim() !== id) {
    throw new Error('Invalid Growth commercial identifier');
  }
  const encoded = `id_${encodeURIComponent(id)}`;
  if (encoded.length > 1500) throw new Error('Growth commercial identifier exceeds Firestore limit');
  return encoded;
}

export function growthEnterpriseContextPath(scope: GrowthCommercialScope): string {
  return [
    GROWTH_COLLECTIONS.COMMERCIAL_CONTEXTS, growthCommercialIdSegment(scope.tenantId),
    GROWTH_COMMERCIAL_SUBCOLLECTIONS.COMPANIES, growthCommercialIdSegment(scope.companyId),
  ].join('/');
}

export function growthProductContextsPath(scope: GrowthCommercialScope): string {
  return `${growthEnterpriseContextPath(scope)}/${GROWTH_COMMERCIAL_SUBCOLLECTIONS.PRODUCTS}`;
}

export function growthProductContextPath(
  scope: GrowthCommercialScope,
  productId: string,
): string {
  return `${growthProductContextsPath(scope)}/${growthCommercialIdSegment(productId)}`;
}
