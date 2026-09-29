import type {
  BusinessKnowledgeField,
  BusinessProfile,
  ProductProfile,
} from '../types/businessProfile';
import type {
  CommercialEvidence,
  CommercialKnowledgeField,
  EnterpriseCommercialContext,
  ProductContext,
} from '../types/growthCommercialContext';

type CompanyField = keyof Pick<BusinessProfile, 'companyName' | 'businessDescription'>;
type ProductField = keyof Pick<ProductProfile,
  'name' | 'description' | 'category' | 'differentiators' | 'targetCustomers'>;
type Scope = Pick<BusinessProfile, 'tenantId' | 'companyId'>;

export interface CommercialContextSnapshot {
  enterprise: EnterpriseCommercialContext;
  products: readonly ProductContext[];
}

/** Read hydration can discover a catalog before an enterprise document exists. */
export interface CommercialContextReadSnapshot {
  enterprise: EnterpriseCommercialContext | null;
  products: readonly ProductContext[];
}

/** Only selected, confirmed, non-null fields can change canonical knowledge. */
export interface ConfirmedBusinessProfileChanges {
  company?: {
    fields: readonly CompanyField[];
    evidence?: readonly CommercialEvidence[];
  };
  products?: readonly {
    id: ProductContext['id'];
    fields: readonly ProductField[];
    evidence?: readonly CommercialEvidence[];
  }[];
}

function assertScope(expected: Scope, actual: Scope): void {
  if (
    !expected.companyId.trim() || actual.companyId !== expected.companyId
  ) {
    throw new Error('Commercial context company mismatch');
  }
}

function assertProducts(scope: Scope, products: readonly Pick<ProductContext,
  'id' | 'tenantId' | 'companyId'>[]): void {
  const ids = new Set<string>();
  for (const product of products) {
    assertScope(scope, product);
    if (!product.id.trim() || ids.has(product.id)) {
      throw new Error('Missing or duplicate product id');
    }
    ids.add(product.id);
  }
}

function assertInputs(snapshot: CommercialContextReadSnapshot, session: BusinessProfile): void {
  if (snapshot.enterprise) assertScope(session, snapshot.enterprise);
  assertScope(session, session);
  assertProducts(session, snapshot.products);
  assertProducts(session, session.products);
  if ((snapshot.enterprise && !snapshot.enterprise.id.trim()) || !session.id.trim() || !session.person.userId.trim()) {
    throw new Error('Missing enterprise or session identity');
  }
}

/** Copy only canonical properties: freshness must never leak into canonical fields. */
function canonicalField<T>(field: CommercialKnowledgeField<T>): CommercialKnowledgeField<T> {
  return {
    value: structuredClone(field.value),
    status: field.status,
    confidence: field.confidence,
    evidenceIds: [...field.evidenceIds],
  };
}

function sessionField<T>(
  field: CommercialKnowledgeField<T>,
  previous?: BusinessKnowledgeField<T>,
): BusinessKnowledgeField<T> {
  const result: BusinessKnowledgeField<T> = canonicalField(field);
  if (previous?.freshness !== undefined) result.freshness = previous.freshness;
  return result;
}

function missing<T>(): CommercialKnowledgeField<T> {
  return { value: null, status: 'missing', confidence: 0, evidenceIds: [] };
}

function mergeEvidence(
  current: readonly CommercialEvidence[],
  incoming: readonly CommercialEvidence[] = [],
): CommercialEvidence[] {
  const result = structuredClone([...current]);
  for (const entry of incoming) {
    const existing = result.find(item => item.id === entry.id);
    if (existing) {
      if (
        existing.sourceType !== entry.sourceType || existing.sourceRef !== entry.sourceRef ||
        existing.label !== entry.label || existing.capturedAt !== entry.capturedAt
      ) {
        throw new Error('Evidence id conflicts with existing evidence');
      }
      continue;
    }
    result.push(structuredClone(entry));
  }
  return result;
}

function confirmedField<T>(
  current: CommercialKnowledgeField<T>,
  incoming: BusinessKnowledgeField<T> | undefined,
  evidence: readonly CommercialEvidence[],
): CommercialKnowledgeField<T> {
  if (!incoming || incoming.status !== 'confirmed' || incoming.value === null) return current;
  if (typeof incoming.value === 'string' && !incoming.value.trim()) return current;
  if (incoming.evidenceIds.some(id => !evidence.some(entry => entry.id === id))) {
    throw new Error('Confirmed field references unavailable evidence');
  }
  return {
    ...canonicalField(incoming),
    evidenceIds: [...new Set([...current.evidenceIds, ...incoming.evidenceIds])],
  };
}

function newProduct(profile: ProductProfile): ProductContext {
  if (
    !profile.createdAt || !profile.updatedAt ||
    !Number.isFinite(Date.parse(profile.createdAt)) ||
    !Number.isFinite(Date.parse(profile.updatedAt))
  ) {
    throw new Error('New product requires explicit valid timestamps');
  }
  return {
    id: profile.id,
    tenantId: profile.tenantId,
    companyId: profile.companyId,
    name: missing(),
    description: missing(),
    category: missing(),
    problemsSolved: missing(),
    capabilities: missing(),
    benefits: missing(),
    differentiators: missing(),
    idealCustomerProfiles: missing(),
    targetIndustries: missing(),
    useCases: missing(),
    pricingContext: missing(),
    commercialEvidence: missing(),
    claimsRestrictions: missing(),
    preferredMessages: missing(),
    websiteUrl: missing(),
    evidence: [],
    status: 'draft',
    completenessScore: 0,
    version: 1,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Pure SESSION_VIEW adapter; performs no I/O and grants no persistence authority.
 *
 * customersOrMarkets mixes audiences and markets, so it cannot become targetMarkets.
 * Product markets and valueProposition have no exact canonical counterparts; neither
 * targetIndustries nor preferredMessages is an equivalent. They remain in the session.
 * targetCustomers describes customer profiles, matching idealCustomerProfiles.
 *
 * Pass the same session back to fromCommercialContext to retain unmapped values,
 * person, catalogReviewed and freshness. A canonical snapshot alone cannot recover
 * this metadata. No catalog review or freshness is inferred from an empty array.
 */
export class BusinessProfileCommercialContextMapper {
  static fromCommercialContext(
    snapshot: CommercialContextReadSnapshot,
    session: BusinessProfile,
  ): BusinessProfile {
    assertInputs(snapshot, session);
    const view = structuredClone(session);
    const enterprise = snapshot.enterprise;
    if (enterprise) {
      view.companyName = sessionField(enterprise.companyName, session.companyName);
      view.businessDescription = sessionField(enterprise.businessDescription, session.businessDescription);
    }
    view.products = snapshot.products.map(product => {
      const previous = session.products.find(item => item.id === product.id);
      const result: ProductProfile = {
        id: product.id,
        tenantId: product.tenantId,
        companyId: product.companyId,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        name: sessionField(product.name, previous?.name),
        description: sessionField(product.description, previous?.description),
        category: sessionField(product.category, previous?.category),
        differentiators: sessionField(product.differentiators, previous?.differentiators),
        targetCustomers: sessionField(product.idealCustomerProfiles, previous?.targetCustomers),
      };
      if (previous?.markets) result.markets = structuredClone(previous.markets);
      if (previous?.valueProposition) result.valueProposition = structuredClone(previous.valueProposition);
      return result;
    });
    // Pending session products are retained without asserting canonical existence.
    const canonicalIds = new Set(snapshot.products.map(product => product.id));
    view.products.push(...structuredClone(session.products.filter(product => !canonicalIds.has(product.id))));
    return view;
  }

  /**
   * Requires current canonical snapshots and an explicit selection of confirmed edits.
   * Omitted products/fields are not deletions. Missing/inferred candidates do not erase
   * or downgrade knowledge. Evidence can be appended, never replaced by id.
   *
   * Existing status, version, timestamps and completenessScore are preserved; any
   * future persistence layer must validate/recompute metadata on actual writes.
   * New products start as draft/version 1 with only explicitly confirmed knowledge.
   */
  static toCommercialContext(
    profile: BusinessProfile,
    existing: CommercialContextSnapshot,
    changes: ConfirmedBusinessProfileChanges,
  ): { enterprise: EnterpriseCommercialContext; products: ProductContext[] } {
    assertInputs(existing, profile);
    const enterprise = structuredClone(existing.enterprise);
    const products = structuredClone([...existing.products]);

    if (changes.company) {
      enterprise.evidence = mergeEvidence(enterprise.evidence, changes.company.evidence);
      for (const field of changes.company.fields) {
        enterprise[field] = confirmedField(enterprise[field], profile[field], enterprise.evidence);
      }
    }

    const changedIds = new Set<string>();
    for (const change of changes.products ?? []) {
      if (changedIds.has(change.id)) throw new Error('Duplicate product change');
      changedIds.add(change.id);
      const source = profile.products.find(product => product.id === change.id);
      if (!source) throw new Error('Product change has no session product');
      const current = products.find(product => product.id === change.id);
      const result = current ?? newProduct(source);
      result.evidence = mergeEvidence(result.evidence, change.evidence);
      for (const field of change.fields) {
        if (field === 'targetCustomers') {
          result.idealCustomerProfiles = confirmedField(
            result.idealCustomerProfiles, source.targetCustomers, result.evidence,
          );
          continue;
        }
        if (field === 'differentiators') {
          result.differentiators = confirmedField(result.differentiators, source.differentiators, result.evidence);
          continue;
        }
        result[field] = confirmedField(result[field], source[field], result.evidence);
      }
      if (current) continue;
      if (result.name.status !== 'confirmed' || !result.name.value?.trim()) {
        throw new Error('New product requires an explicitly selected confirmed name');
      }
      // The other ten knowledge fields remain missing in a new minimal context.
      const fields = [
        result.name, result.description, result.category,
        result.differentiators, result.idealCustomerProfiles,
      ];
      result.completenessScore = Math.round(fields.filter(field => field.status !== 'missing').length / 15 * 100);
      products.push(result);
    }
    return { enterprise, products };
  }
}
