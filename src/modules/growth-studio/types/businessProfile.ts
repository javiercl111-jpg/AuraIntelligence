import type {
  CommercialKnowledgeField,
  ProductContext,
} from './growthCommercialContext';

/** Freshness is independent of evidence/confidence; no age policy is assumed. */
export type BusinessKnowledgeField<T> = CommercialKnowledgeField<T> & {
  freshness?: 'KNOWN' | 'MISSING' | 'STALE';
};

/** Minimal view of the existing commercial product contract. */
export interface ProductProfile extends Pick<ProductContext,
  'id' | 'tenantId' | 'companyId' | 'status' | 'createdAt' | 'updatedAt'> {
  name: BusinessKnowledgeField<string>;
  description?: BusinessKnowledgeField<string>;
  category?: BusinessKnowledgeField<string>;
  targetCustomers?: BusinessKnowledgeField<string[]>;
  markets?: BusinessKnowledgeField<string[]>;
  valueProposition?: BusinessKnowledgeField<string>;
  differentiators?: BusinessKnowledgeField<string[]>;
}

/** Reusable input contract, NOT a persistence authority or campaign snapshot. */
export interface BusinessProfile {
  id: string;
  tenantId: string;
  companyId: string;
  person: {
    userId: string;
    name?: BusinessKnowledgeField<string>;
    role?: BusinessKnowledgeField<string>;
  };
  companyName?: BusinessKnowledgeField<string>;
  businessDescription?: BusinessKnowledgeField<string>;
  customersOrMarkets?: BusinessKnowledgeField<string>;
  products: ProductProfile[];
  /** Distinguishes an explicitly empty catalogue from an unknown one. */
  catalogReviewed?: boolean;
}
