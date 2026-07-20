// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Brand Brain Profile
// ─────────────────────────────────────────────────────────────

/**
 * Confidence level for a brand brain data source.
 */
export type BrandDataConfidence =
  | 'verified'
  | 'inferred'
  | 'user_provided'
  | 'unknown';

/**
 * Provenance record for a piece of brand information.
 */
export interface BrandDataProvenance {
  /** Where this data came from. */
  source: string;

  /** Confidence level in the data accuracy. */
  confidence: BrandDataConfidence;

  /** ISO 8601 timestamp when this data was last verified. */
  lastVerifiedAt: string | null;
}

/**
 * Brand identity description.
 */
export interface BrandIdentity {
  /** Brand name. */
  name: string;

  /** Brand tagline or slogan. */
  tagline: string;

  /** Mission statement. */
  mission: string;

  /** Vision statement. */
  vision: string;

  /** Provenance of this identity data. */
  provenance: BrandDataProvenance;
}

/**
 * Voice and tone configuration for brand communications.
 */
export interface BrandTone {
  /** Primary tone descriptor (e.g. "professional", "conversational"). */
  primary: string;

  /** Secondary tone descriptors. */
  secondary: string[];

  /** Formality level from 1 (casual) to 5 (very formal). */
  formalityLevel: 1 | 2 | 3 | 4 | 5;

  /** Example phrases that reflect the desired tone. */
  examplePhrases: string[];
}

/**
 * Language guidelines for brand content.
 */
export interface BrandLanguageGuidelines {
  /** Preferred terms and phrases. */
  preferredTerms: string[];

  /** Prohibited terms and phrases. */
  prohibitedTerms: string[];

  /** Primary language code (e.g. "es", "en"). */
  primaryLanguage: string;

  /** Supported secondary languages. */
  secondaryLanguages: string[];
}

/**
 * Target audience definition.
 */
export interface BrandAudience {
  /** Audience segment name. */
  name: string;

  /** Description of this audience segment. */
  description: string;

  /** Key pain points for this audience. */
  painPoints: string[];

  /** Communication preferences. */
  preferredChannels: string[];
}

/**
 * Product or service entry for brand context.
 */
export interface BrandProductOrService {
  /** Name of the product or service. */
  name: string;

  /** Short description. */
  description: string;

  /** Key differentiators. */
  differentiators: string[];

  /** Value proposition for this product. */
  valueProposition: string;
}

/**
 * Visual identity reference (not the assets themselves).
 */
export interface BrandVisualIdentityRef {
  /** Primary brand color (hex). */
  primaryColor: string;

  /** Secondary brand colors (hex). */
  secondaryColors: string[];

  /** Logo asset reference (URL or asset ID). */
  logoRef: string | null;

  /** Typography preferences. */
  typography: string[];
}

/**
 * Complete Brand Brain profile representing an organization's
 * brand knowledge and communication guidelines.
 *
 * This profile feeds AI-generated content to ensure alignment
 * with the brand identity, tone, and values.
 */
export interface BrandBrainProfile {
  /** Unique identifier. */
  readonly id: string;

  /** Tenant that owns this profile. */
  readonly tenantId: string;

  /** Company within the tenant. */
  readonly companyId: string;

  /** Brand identity. */
  identity: BrandIdentity;

  /** Value proposition summary. */
  valueProposition: string;

  /** Voice and tone configuration. */
  tone: BrandTone;

  /** Core brand values. */
  values: string[];

  /** Target audiences. */
  audiences: BrandAudience[];

  /** Products or services. */
  productsAndServices: BrandProductOrService[];

  /** Key differentiators. */
  differentiators: string[];

  /** Language guidelines. */
  languageGuidelines: BrandLanguageGuidelines;

  /** Visual identity references. */
  visualIdentity: BrandVisualIdentityRef;

  /** Overall confidence and provenance. */
  dataProvenance: BrandDataProvenance;

  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;

  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

