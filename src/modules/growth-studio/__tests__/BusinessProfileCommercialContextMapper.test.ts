import { describe, expect, it } from 'vitest';

import {
  BusinessProfileCommercialContextMapper as Mapper,
  type CommercialContextSnapshot,
  type ConfirmedBusinessProfileChanges,
} from '../services/BusinessProfileCommercialContextMapper';
import { ProductContextReadiness } from '../services/ProductContextReadiness';
import type { BusinessKnowledgeField, BusinessProfile, ProductProfile } from '../types/businessProfile';
import type {
  CommercialEvidence,
  CommercialKnowledgeField,
  EnterpriseCommercialContext,
  ProductContext,
} from '../types/growthCommercialContext';

const CREATED = '2026-01-01T00:00:00.000Z';
const UPDATED = '2026-02-01T00:00:00.000Z';
const scope = { tenantId: 'tenant-a', companyId: 'company-a' };

function field<T>(value: T, evidenceId = 'product-source'): CommercialKnowledgeField<T> {
  return { value, status: 'confirmed', confidence: 87, evidenceIds: [evidenceId] };
}

function confirmed<T>(value: T): BusinessKnowledgeField<T> {
  return { value, status: 'confirmed', confidence: 100, evidenceIds: [], freshness: 'KNOWN' };
}

function evidence(id: string): CommercialEvidence {
  return { id, sourceType: 'user', label: 'Explicitly supplied evidence', capturedAt: CREATED };
}

function enterprise(): EnterpriseCommercialContext {
  return {
    id: 'enterprise-a', ...scope,
    companyName: field('Aura', 'company-source'),
    businessDescription: { ...field('Software empresarial', 'company-source'), status: 'inferred', confidence: 65 },
    industry: field('Software', 'company-source'),
    valueProposition: field('Inteligencia operativa', 'company-source'),
    differentiators: field(['Modular'], 'company-source'),
    targetMarkets: field(['México'], 'company-source'),
    brandTone: field('Profesional', 'company-source'),
    communicationStyle: field('Ejecutivo', 'company-source'),
    businessGoals: field(['Adopción'], 'company-source'),
    evidence: [evidence('company-source')],
    status: 'active', completenessScore: 100, version: 7,
    createdAt: CREATED, updatedAt: UPDATED,
  };
}

function product(id = 'product-a'): ProductContext {
  return {
    id, ...scope,
    name: field('Aura HCM'),
    description: field('Gestión de personas'),
    category: field('HCM'),
    problemsSolved: field(['Trabajo manual']),
    capabilities: field(['Automatización']),
    benefits: field(['Menos tareas manuales']),
    differentiators: field(['Modular']),
    idealCustomerProfiles: field(['Directores de recursos humanos']),
    targetIndustries: field(['Manufactura']),
    useCases: field(['Onboarding']),
    pricingContext: field('Suscripción'),
    commercialEvidence: field(['Referencia aportada']),
    claimsRestrictions: field(['Sin garantías de ROI']),
    preferredMessages: field(['Gestión integrada']),
    websiteUrl: field('https://example.test/product'),
    evidence: [evidence('product-source')],
    status: 'active', completenessScore: 100, version: 9,
    createdAt: CREATED, updatedAt: UPDATED,
  };
}

function snapshot(): CommercialContextSnapshot {
  return { enterprise: enterprise(), products: [product()] };
}

function session(): BusinessProfile {
  return {
    id: 'session-profile-a', ...scope,
    person: { userId: 'user-a', name: confirmed('Javier'), role: confirmed('Director') },
    products: [],
  };
}

function newSessionProduct(): ProductProfile {
  return {
    id: 'product-new', ...scope, name: confirmed('Nuevo producto'),
    status: 'draft', createdAt: CREATED, updatedAt: UPDATED,
  };
}

function fullSelection(profile: BusinessProfile): ConfirmedBusinessProfileChanges {
  return {
    company: { fields: ['companyName', 'businessDescription'] },
    products: profile.products.map(item => ({
      id: item.id,
      fields: ['name', 'description', 'category', 'differentiators', 'targetCustomers'],
    })),
  };
}

function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) frozen(child);
  }
  return value;
}

describe('BusinessProfileCommercialContextMapper round trips', () => {
  it('CASE 1: preserves company, product, knowledge and scope in the session view', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());

    expect(view).toMatchObject({
      id: 'session-profile-a', ...scope,
      companyName: source.enterprise.companyName,
      businessDescription: source.enterprise.businessDescription,
      person: session().person,
    });
    expect(view.products[0]).toEqual({
      id: 'product-a', ...scope,
      name: source.products[0].name,
      description: source.products[0].description,
      category: source.products[0].category,
      differentiators: source.products[0].differentiators,
      targetCustomers: source.products[0].idealCustomerProfiles,
      status: 'active', createdAt: CREATED, updatedAt: UPDATED,
    });
    expect(Mapper.toCommercialContext(view, source, fullSelection(view))).toEqual(source);
  });

  it('CASE 2: overlays only confirmed selected fields and preserves all other canonical knowledge', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = confirmed('Aura Nexus');
    view.businessDescription = confirmed('Nueva descripción');
    view.products[0].name = confirmed('Aura People');
    view.products[0].description = confirmed('Descripción producto');
    view.products[0].category = confirmed('SaaS');
    view.products[0].differentiators = confirmed(['Integrado']);

    const result = Mapper.toCommercialContext(view, source, fullSelection(view));
    const expected = structuredClone(source);
    expected.enterprise.companyName = { ...field('Aura Nexus', 'company-source'), confidence: 100 };
    expected.enterprise.businessDescription = { ...field('Nueva descripción', 'company-source'), confidence: 100 };
    const expectedProduct = expected.products[0];
    expectedProduct.name = { ...field('Aura People'), confidence: 100 };
    expectedProduct.description = { ...field('Descripción producto'), confidence: 100 };
    expectedProduct.category = { ...field('SaaS'), confidence: 100 };
    expectedProduct.differentiators = { ...field(['Integrado']), confidence: 100 };
    expect(result).toEqual(expected);
    expect(Mapper.fromCommercialContext(result, view).products[0].name.value).toBe('Aura People');
  });

  it('CASE 3: maps targetCustomers to idealCustomerProfiles in both directions', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.products[0].targetCustomers = confirmed(['Responsables de talento']);
    const result = Mapper.toCommercialContext(view, source, {
      products: [{ id: 'product-a', fields: ['targetCustomers'] }],
    });

    expect(result.products[0].idealCustomerProfiles).toEqual({
      ...field(['Responsables de talento']), confidence: 100,
    });
    expect(Mapper.fromCommercialContext(result, view).products[0].targetCustomers).toEqual({
      ...result.products[0].idealCustomerProfiles, freshness: 'KNOWN',
    });
  });

  it('CASE 4: retains markets in the session without changing targetIndustries', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.products[0].markets = confirmed(['Latinoamérica']);
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));
    const restored = Mapper.fromCommercialContext(result, view);

    expect(result.products[0].targetIndustries).toEqual(source.products[0].targetIndustries);
    expect(result.products[0]).not.toHaveProperty('markets');
    expect(restored.products[0].markets).toEqual(view.products[0].markets);
  });

  it('CASE 5: retains product valueProposition without changing preferredMessages', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.products[0].valueProposition = confirmed('Valor propio del producto');
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));

    expect(result.products[0].preferredMessages).toEqual(source.products[0].preferredMessages);
    expect(result.products[0]).not.toHaveProperty('valueProposition');
    expect(result.enterprise.valueProposition).toEqual(source.enterprise.valueProposition);
    expect(Mapper.fromCommercialContext(result, view).products[0].valueProposition)
      .toEqual(view.products[0].valueProposition);
  });

  it('CASE 6: preserves evidence, version, ids, timestamps, status and completeness on updates', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = confirmed('Actualizada');
    view.products[0].name = confirmed('Actualizado');
    view.products[0] = {
      ...view.products[0], status: 'archived',
      createdAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-01T00:00:00.000Z',
    };
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));

    for (const [before, after] of [
      [source.enterprise, result.enterprise],
      [source.products[0], result.products[0]],
    ]) {
      expect(after).toMatchObject({
        id: before.id, tenantId: before.tenantId, companyId: before.companyId,
        createdAt: before.createdAt, updatedAt: before.updatedAt,
        version: before.version, status: before.status,
        evidence: before.evidence, completenessScore: before.completenessScore,
      });
    }
    expect(result.enterprise.companyName.evidenceIds).toEqual(['company-source']);
    expect(result.products[0].name.evidenceIds).toEqual(['product-source']);
  });

  it('CASE 7: creates only a selected minimal product with no fabricated knowledge', () => {
    const source = snapshot();
    const view = session();
    const added = newSessionProduct();
    view.products = [added];
    const result = Mapper.toCommercialContext(view, source, {
      products: [{ id: added.id, fields: ['name'] }],
    });
    const created = result.products[1];
    expect(result.products[0]).toEqual(source.products[0]);
    expect(created).toMatchObject({
      id: added.id, ...scope,
      name: { value: 'Nuevo producto', status: 'confirmed', confidence: 100, evidenceIds: [] },
      status: 'draft', version: 1, evidence: [], createdAt: CREATED, updatedAt: UPDATED,
      completenessScore: 7,
    });
    const unknown = { value: null, status: 'missing', confidence: 0, evidenceIds: [] };
    expect([
      created.description, created.category, created.problemsSolved, created.capabilities,
      created.benefits, created.differentiators, created.idealCustomerProfiles, created.targetIndustries,
      created.useCases, created.pricingContext, created.commercialEvidence, created.claimsRestrictions,
      created.preferredMessages, created.websiteUrl,
    ]).toEqual(Array.from({ length: 14 }, () => unknown));
    expect(created.name).not.toHaveProperty('freshness');
    expect(ProductContextReadiness.evaluate(created)).toMatchObject({
      level: 'known', strategyReady: false, outreachReady: false, unsupportedEvidenceIds: [],
    });
    expect(Mapper.fromCommercialContext(result, view).products[1].name).toEqual(added.name);
  });

  it('CASE 8: distinguishes unknown, reviewed empty and populated catalogs without placeholders', () => {
    const empty = { enterprise: enterprise(), products: [] };
    const unknown = Mapper.fromCommercialContext(empty, session());
    const reviewed = Mapper.fromCommercialContext(empty, { ...session(), catalogReviewed: true });
    const unreviewed = Mapper.fromCommercialContext(empty, { ...session(), catalogReviewed: false });
    const populated = Mapper.fromCommercialContext(snapshot(), session());

    expect(unknown.products).toEqual([]);
    expect(unknown.catalogReviewed).toBeUndefined();
    expect(reviewed.products).toEqual([]);
    expect(reviewed.catalogReviewed).toBe(true);
    expect(unreviewed.catalogReviewed).toBe(false);
    expect(populated.products).toHaveLength(1);
    expect(populated.catalogReviewed).toBeUndefined();
    const roundTrip = Mapper.toCommercialContext(reviewed, empty, {});
    expect(roundTrip.products).toEqual([]);
    expect(Mapper.fromCommercialContext(roundTrip, reviewed)).toEqual(reviewed);
  });

  it('CASE 9: keeps person and session identity out of both canonical authorities', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));
    for (const context of [result.enterprise, ...result.products]) {
      expect(context).not.toHaveProperty('person');
      expect(context).not.toHaveProperty('userId');
      expect(context).not.toHaveProperty('role');
    }
    expect(JSON.stringify(result)).not.toContain('Javier');
    expect(JSON.stringify(result)).not.toContain('user-a');
    expect(Mapper.fromCommercialContext(result, view).person).toEqual(view.person);
  });

  it('CASE 10: an incomplete view cannot erase canonical fields or omitted products', () => {
    const source = { enterprise: enterprise(), products: [product(), product('product-b')] };
    const view = session();
    view.companyName = { value: null, status: 'missing', confidence: 0, evidenceIds: [], freshness: 'MISSING' };
    view.products = [{
      ...newSessionProduct(), id: 'product-a',
      name: { value: null, status: 'missing', confidence: 0, evidenceIds: [] },
    }];
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));
    expect(result).toEqual(source);
  });

  it.each(['tenantId', 'companyId'] as const)('CASE 11: rejects session %s mismatch in both directions', key => {
    const source = snapshot();
    const view = { ...session(), [key]: 'different-scope' };
    expect(() => Mapper.fromCommercialContext(source, view)).toThrow(/tenant\/company mismatch/);
    expect(() => Mapper.toCommercialContext(view, source, {})).toThrow(/tenant\/company mismatch/);
  });

  it.each(['tenantId', 'companyId'] as const)('CASE 12: rejects canonical product %s mismatch even when unselected', key => {
    const source = { enterprise: enterprise(), products: [{ ...product(), [key]: 'different-scope' }] };
    expect(() => Mapper.fromCommercialContext(source, session())).toThrow(/tenant\/company mismatch/);
    expect(() => Mapper.toCommercialContext(session(), source, {})).toThrow(/tenant\/company mismatch/);
  });

  it('keeps customersOrMarkets separate from enterprise targetMarkets', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.customersOrMarkets = confirmed('Pymes de México');
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));
    expect(result.enterprise.targetMarkets).toEqual(source.enterprise.targetMarkets);
    expect(result.enterprise).not.toHaveProperty('customersOrMarkets');
    expect(Mapper.fromCommercialContext(result, view).customersOrMarkets).toEqual(view.customersOrMarkets);
  });

  it('preserves freshness only with session metadata and never claims canonical recovery', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = { ...view.companyName!, freshness: 'STALE' };
    view.businessDescription = { ...view.businessDescription!, freshness: 'KNOWN' };
    view.products[0].name.freshness = 'STALE';
    view.products[0].description = { ...view.products[0].description!, freshness: 'MISSING' };
    view.products[0].category = { ...view.products[0].category!, freshness: 'KNOWN' };
    view.products[0].differentiators = { ...view.products[0].differentiators!, freshness: 'KNOWN' };
    view.products[0].targetCustomers = { ...view.products[0].targetCustomers!, freshness: 'STALE' };
    const result = Mapper.toCommercialContext(view, source, fullSelection(view));
    expect(JSON.stringify(result)).not.toContain('freshness');
    expect(Mapper.fromCommercialContext(result, view)).toEqual(view);
    const newSession = Mapper.fromCommercialContext(result, session());
    expect(newSession.companyName).not.toHaveProperty('freshness');
    expect(newSession.products[0].name).not.toHaveProperty('freshness');
  });

  it('does not apply confirmed but unselected stale values or unselected new products', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = confirmed('Valor de otra revisión');
    view.products[0].name = confirmed('Nombre anterior');
    view.products.push(newSessionProduct());
    expect(Mapper.toCommercialContext(view, source, {})).toEqual(source);
  });

  it('does not downgrade confirmed knowledge with inferred candidates', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = { ...confirmed('Inferida'), status: 'inferred', confidence: 30 };
    view.products[0].name = { ...confirmed('Inferido'), status: 'inferred', confidence: 40 };
    expect(Mapper.toCommercialContext(view, source, fullSelection(view))).toEqual(source);
  });

  it('does not treat null or blank confirmed strings as instructions to erase knowledge', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = { ...confirmed<string>(''), value: null };
    view.products[0].name = confirmed('   ');
    expect(Mapper.toCommercialContext(view, source, fullSelection(view))).toEqual(source);
  });

  it('appends actual evidence and retains old field references without fabricating records', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.companyName = field('Nuevo nombre', 'new-company-source');
    view.products[0].name = field('Nuevo producto', 'new-product-source');
    const result = Mapper.toCommercialContext(view, source, {
      company: { fields: ['companyName'], evidence: [evidence('new-company-source')] },
      products: [{ id: 'product-a', fields: ['name'], evidence: [evidence('new-product-source')] }],
    });
    expect(result.enterprise.companyName.evidenceIds).toEqual(['company-source', 'new-company-source']);
    expect(result.products[0].name.evidenceIds).toEqual(['product-source', 'new-product-source']);
    expect(result.enterprise.evidence).toEqual([...source.enterprise.evidence, evidence('new-company-source')]);
    expect(result.products[0].evidence).toEqual([...source.products[0].evidence, evidence('new-product-source')]);
  });

  it('rejects dangling evidence references and conflicting evidence records', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    view.products[0].name = field('Cambio', 'unknown-evidence');
    expect(() => Mapper.toCommercialContext(view, source, fullSelection(view))).toThrow(/unavailable evidence/);
    expect(() => Mapper.toCommercialContext(view, source, {
      company: { fields: [], evidence: [{ ...evidence('company-source'), label: 'Replaced' }] },
    })).toThrow(/Evidence id conflicts/);
  });

  it.each(['tenantId', 'companyId'] as const)('rejects session products from another %s', key => {
    const source = snapshot();
    const view = session();
    view.products = [{ ...newSessionProduct(), [key]: 'different-scope' }];
    expect(() => Mapper.fromCommercialContext(source, view)).toThrow(/tenant\/company mismatch/);
    expect(() => Mapper.toCommercialContext(view, source, {})).toThrow(/tenant\/company mismatch/);
  });

  it('rejects duplicate ids and changes targeting an absent session product', () => {
    const source = snapshot();
    const view = Mapper.fromCommercialContext(source, session());
    expect(() => Mapper.fromCommercialContext({ ...source, products: [product(), product()] }, session()))
      .toThrow(/duplicate product id/);
    expect(() => Mapper.toCommercialContext({ ...view, products: [view.products[0], view.products[0]] }, source, {}))
      .toThrow(/duplicate product id/);
    expect(() => Mapper.toCommercialContext(view, source, {
      products: [{ id: 'missing-product', fields: ['name'] }],
    })).toThrow(/no session product/);
    expect(() => Mapper.toCommercialContext(view, source, {
      products: [{ id: 'product-a', fields: ['name'] }, { id: 'product-a', fields: [] }],
    })).toThrow(/Duplicate product change/);
  });

  it('requires a selected confirmed name and explicit timestamps for new products', () => {
    const source = snapshot();
    const view = session();
    const added = newSessionProduct();
    view.products = [added];
    expect(() => Mapper.toCommercialContext(view, source, {
      products: [{ id: added.id, fields: [] }],
    })).toThrow(/confirmed name/);
    added.name.status = 'inferred';
    expect(() => Mapper.toCommercialContext(view, source, {
      products: [{ id: added.id, fields: ['name'] }],
    })).toThrow(/confirmed name/);
    added.name = confirmed('Nuevo');
    view.products = [{ ...added, createdAt: '' }];
    expect(() => Mapper.toCommercialContext(view, source, {
      products: [{ id: added.id, fields: ['name'] }],
    })).toThrow(/valid timestamps/);
  });

  it('preserves pending session products and never synthesizes their canonical existence', () => {
    const source = snapshot();
    const previous = session();
    previous.products = [newSessionProduct()];
    const view = Mapper.fromCommercialContext(source, previous);
    expect(view.products).toHaveLength(2);
    expect(view.products[1]).toEqual(previous.products[0]);
    expect(Mapper.toCommercialContext(view, source, {})).toEqual(source);
  });

  it('does not mutate or alias inputs, including arrays and evidence records', () => {
    const source = frozen(snapshot());
    const view = Mapper.fromCommercialContext(source, frozen(session()));
    view.products[0].targetCustomers!.value!.push('Audiencia adicional');
    expect(source.products[0].idealCustomerProfiles.value).toEqual(['Directores de recursos humanos']);
    const result = Mapper.toCommercialContext(frozen(view), source, fullSelection(view));
    result.enterprise.evidence[0] = evidence('replacement');
    result.products[0].benefits.value!.push('Otro beneficio');
    result.products[0].name.evidenceIds.push('another-reference');
    result.products[0].idealCustomerProfiles.value!.push('Otra audiencia');
    expect(source.enterprise.evidence[0].id).toBe('company-source');
    expect(source.products[0].benefits.value).toEqual(['Menos tareas manuales']);
    expect(view.products[0].name.evidenceIds).toEqual(['product-source']);
    expect(view.products[0].targetCustomers!.value).toEqual([
      'Directores de recursos humanos', 'Audiencia adicional',
    ]);
  });
});
