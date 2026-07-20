// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — IBrandBrainService Contract
// ─────────────────────────────────────────────────────────────

import type { BrandBrainProfile } from '../../types/brandBrain';

/**
 * Parameters to create an initial Brand Brain profile.
 */
export interface CreateBrandProfileParams {
  readonly tenantId: string;
  readonly companyId: string;
  readonly identity: BrandBrainProfile['identity'];
  readonly valueProposition: string;
  readonly tone: BrandBrainProfile['tone'];
  readonly values: string[];
}

/**
 * Partial update for a Brand Brain profile.
 * Only the fields provided will be updated.
 */
export type UpdateBrandProfileParams = Partial<
  Pick<
    BrandBrainProfile,
    | 'identity'
    | 'valueProposition'
    | 'tone'
    | 'values'
    | 'audiences'
    | 'productsAndServices'
    | 'differentiators'
    | 'languageGuidelines'
    | 'visualIdentity'
  >
>;

/**
 * Contract for managing Brand Brain profiles.
 *
 * Brand Brain stores and serves the organization's brand
 * knowledge to AI generation services.
 */
export interface IBrandBrainService {
  /**
   * Create a new Brand Brain profile for a company.
   * Only one profile per company is expected.
   */
  createProfile(params: CreateBrandProfileParams): Promise<BrandBrainProfile>;

  /**
   * Retrieve the Brand Brain profile for a company.
   */
  getProfile(tenantId: string, companyId: string): Promise<BrandBrainProfile | null>;

  /**
   * Update an existing Brand Brain profile.
   */
  updateProfile(
    profileId: string,
    updates: UpdateBrandProfileParams,
  ): Promise<BrandBrainProfile>;

  /**
   * Check whether a Brand Brain profile exists for a company.
   */
  hasProfile(tenantId: string, companyId: string): Promise<boolean>;
}


