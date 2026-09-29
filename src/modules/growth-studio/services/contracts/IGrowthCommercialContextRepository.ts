import type { EnterpriseCommercialContext, ProductContext } from '../../types/growthCommercialContext';

/** Company is the only persistence scope; tenantId remains entity metadata. */
export type GrowthCommercialScope = Readonly<Pick<EnterpriseCommercialContext, 'companyId'>>;

export type GrowthCommercialContextErrorCode =
  | 'GROWTH_COMMERCIAL_CONTEXT_INVALID_DATA'
  | 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH'
  | 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH'
  | 'GROWTH_COMMERCIAL_CONTEXT_VERSION_CONFLICT'
  | 'GROWTH_COMMERCIAL_CONTEXT_ALREADY_EXISTS'
  | 'GROWTH_COMMERCIAL_CONTEXT_NOT_FOUND';

export class GrowthCommercialContextRepositoryError extends Error {
  readonly code: GrowthCommercialContextErrorCode;

  constructor(code: GrowthCommercialContextErrorCode, message: string) {
    super(message);
    this.name = 'GrowthCommercialContextRepositoryError';
    this.code = code;
  }
}

/**
 * Canonical entities only. No conversational interpretation or authorization grant.
 * Creates are insert-only, with repository version 1 and storage commit timestamps.
 * Updates require both the current entity version and expectedVersion, preserve
 * identity/createdAt/evidence and existing completenessScore, and increment version.
 * tenantId metadata is retained exactly; attempts to change it on update fail closed.
 * Omitted evidence records are retained; conflicting records are rejected.
 *
 * Write promises acknowledge a commit, not a speculative timestamp. Read explicitly
 * afterwards to obtain server timestamps. No BusinessProfile or Firestore types leak
 * into this contract. Production activation still requires verified security rules.
 */
export interface IGrowthCommercialContextRepository {
  readEnterpriseContext(scope: GrowthCommercialScope): Promise<EnterpriseCommercialContext | null>;
  readProductContexts(scope: GrowthCommercialScope): Promise<ProductContext[]>;
  readProductContext(scope: GrowthCommercialScope, productId: string): Promise<ProductContext | null>;
  createEnterpriseContext(scope: GrowthCommercialScope, context: EnterpriseCommercialContext): Promise<void>;
  updateEnterpriseContext(
    scope: GrowthCommercialScope, context: EnterpriseCommercialContext, expectedVersion: number,
  ): Promise<void>;
  createProductContext(
    scope: GrowthCommercialScope, productId: string, context: ProductContext,
  ): Promise<void>;
  updateProductContext(
    scope: GrowthCommercialScope, productId: string, context: ProductContext, expectedVersion: number,
  ): Promise<void>;
}
