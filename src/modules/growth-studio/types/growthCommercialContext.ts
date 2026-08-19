export type CommercialKnowledgeStatus =
  | 'confirmed'
  | 'inferred'
  | 'missing';

export type CommercialContextStatus =
  | 'draft'
  | 'active'
  | 'archived';

export interface CommercialEvidence {
  readonly id: string;
  readonly sourceType:
    | 'user'
    | 'company_website'
    | 'company_document'
    | 'product_document'
    | 'intelligence'
    | 'control_center'
    | 'other';
  readonly sourceRef?: string;
  readonly label: string;
  readonly capturedAt: string;
}

export interface CommercialKnowledgeField<T> {
  value: T | null;
  status: CommercialKnowledgeStatus;
  confidence: number;
  evidenceIds: string[];
}

export interface EnterpriseCommercialContext {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;

  companyName: CommercialKnowledgeField<string>;
  businessDescription: CommercialKnowledgeField<string>;
  industry: CommercialKnowledgeField<string>;
  valueProposition: CommercialKnowledgeField<string>;
  differentiators: CommercialKnowledgeField<string[]>;
  targetMarkets: CommercialKnowledgeField<string[]>;
  brandTone: CommercialKnowledgeField<string>;
  communicationStyle: CommercialKnowledgeField<string>;
  businessGoals: CommercialKnowledgeField<string[]>;

  evidence: CommercialEvidence[];

  status: CommercialContextStatus;
  completenessScore: number;
  version: number;

  readonly createdAt: string;
  updatedAt: string;
}

export interface ProductContext {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;

  name: CommercialKnowledgeField<string>;
  category: CommercialKnowledgeField<string>;
  description: CommercialKnowledgeField<string>;

  problemsSolved: CommercialKnowledgeField<string[]>;
  capabilities: CommercialKnowledgeField<string[]>;
  benefits: CommercialKnowledgeField<string[]>;
  differentiators: CommercialKnowledgeField<string[]>;

  idealCustomerProfiles: CommercialKnowledgeField<string[]>;
  targetIndustries: CommercialKnowledgeField<string[]>;
  useCases: CommercialKnowledgeField<string[]>;

  pricingContext: CommercialKnowledgeField<string>;
  commercialEvidence: CommercialKnowledgeField<string[]>;
  claimsRestrictions: CommercialKnowledgeField<string[]>;
  preferredMessages: CommercialKnowledgeField<string[]>;
  websiteUrl: CommercialKnowledgeField<string>;

  evidence: CommercialEvidence[];

  status: CommercialContextStatus;
  completenessScore: number;
  version: number;

  readonly createdAt: string;
  updatedAt: string;
}

export interface EnterpriseCommercialContextRef {
  readonly contextId: string;
  readonly version: number;
}

export interface ProductContextRef {
  readonly productContextId: string;
  readonly version: number;
}

export interface GrowthProspectContextRef {
  readonly prospectId: string;
  readonly sourceAuthority:
    | 'control_center'
    | 'intelligence'
    | 'manual';
  readonly sourceRef?: string;
}

export interface GrowthCommercialContextRefs {
  readonly enterprise: EnterpriseCommercialContextRef;
  readonly product: ProductContextRef;
  readonly prospect?: GrowthProspectContextRef;
}

export const GROWTH_COMMERCIAL_CONTEXT_THRESHOLDS = {
  ENTERPRISE_STRATEGY_READY: 70,
  PRODUCT_STRATEGY_READY: 75,
  PRODUCT_OUTREACH_READY: 85,
} as const;
