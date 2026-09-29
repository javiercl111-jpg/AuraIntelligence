import { afterAll, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { getFirestore, Timestamp, type DocumentReference } from 'firebase/firestore';

import {
  GROWTH_COLLECTIONS, growthCommercialIdSegment, growthCompanyIdSegment, growthEnterpriseContextPath,
  growthProductContextPath, growthProductContextsPath,
} from '../config/growthStudioCollections';
import {
  createGrowthCommercialContextRepository, FirestoreGrowthCommercialContextRepository,
  type GrowthCommercialFirestorePort, type GrowthCommercialFirestoreTransaction,
  type GrowthCommercialStoredDocument,
} from '../services/growthCommercialContextRepository';
import type {
  GrowthCommercialScope,
} from '../services/contracts/IGrowthCommercialContextRepository';
import type {
  CommercialEvidence, CommercialKnowledgeField, EnterpriseCommercialContext, ProductContext,
} from '../types/growthCommercialContext';
import { BusinessProfileCommercialContextMapper } from '../services/BusinessProfileCommercialContextMapper';

const sdk = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(), transaction: vi.fn() }));
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return { ...actual, getDocFromServer: sdk.get, getDocsFromServer: sdk.list, runTransaction: sdk.transaction };
});

const scope: GrowthCommercialScope = { companyId: 'company-independent' };
const TENANT_METADATA = 'tenant-independent';
const INPUT_TIME = '2020-01-01T00:00:00.000Z';
const CREATE_TIME = '2026-09-01T12:00:00.000Z';
const UPDATE_TIME = '2026-09-02T12:00:00.000Z';
const SERVER_TIME = Symbol('fake-server-commit-time');
const invalidCode = 'GROWTH_COMMERCIAL_CONTEXT_INVALID_DATA';
const conflictCode = 'GROWTH_COMMERCIAL_CONTEXT_VERSION_CONFLICT';

function field<T>(value: T): CommercialKnowledgeField<T> {
  return { value, status: 'confirmed', confidence: 91, evidenceIds: ['evidence-a'] };
}

function evidence(id = 'evidence-a'): CommercialEvidence {
  return { id, sourceType: 'user', label: 'User confirmation', capturedAt: INPUT_TIME };
}

function metadata() {
  return {
    ...scope, tenantId: TENANT_METADATA, evidence: [evidence()], status: 'draft' as const, version: 1,
    completenessScore: 63, createdAt: INPUT_TIME, updatedAt: INPUT_TIME,
  };
}

function enterprise(): EnterpriseCommercialContext {
  return {
    ...metadata(), id: 'enterprise-stable',
    companyName: field('Aura'), businessDescription: field('Software'),
    industry: field('Software'), valueProposition: field('Intelligence'),
    differentiators: field(['Modular']), targetMarkets: field(['México']),
    brandTone: field('Professional'), communicationStyle: field('Direct'),
    businessGoals: field(['Growth']),
  };
}

function product(id = 'product-stable'): ProductContext {
  return {
    ...metadata(), id,
    name: field('Aura HCM'), category: field('HCM'), description: field('People operations'),
    problemsSolved: field(['Manual work']), capabilities: field(['Automation']),
    benefits: field(['Less manual work']), differentiators: field(['Modular']),
    idealCustomerProfiles: field(['People leaders']), targetIndustries: field(['Manufacturing']),
    useCases: field(['Onboarding']), pricingContext: field('Subscription'),
    commercialEvidence: field(['Reference']), claimsRestrictions: field(['No ROI guarantees']),
    preferredMessages: field(['Integrated']), websiteUrl: field('https://example.test/product'),
  };
}

function stored(context: EnterpriseCommercialContext | ProductContext): Record<string, unknown> {
  return {
    ...structuredClone(context),
    createdAt: Timestamp.fromDate(new Date(CREATE_TIME)),
    updatedAt: Timestamp.fromDate(new Date(CREATE_TIME)),
  };
}

function copy(value: unknown, commitTime?: Timestamp): unknown {
  if (value === SERVER_TIME && commitTime) return commitTime;
  if (value instanceof Timestamp) return new Timestamp(value.seconds, value.nanoseconds);
  if (Array.isArray(value)) return value.map(item => copy(item, commitTime));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copy(child, commitTime)]));
  }
  return value;
}

/** Atomic, serialized unit-test store. It does not emulate or certify security rules. */
class FakeFirestore implements GrowthCommercialFirestorePort {
  readonly documents = new Map<string, unknown>();
  now = Timestamp.fromDate(new Date(CREATE_TIME));
  transactions = 0;
  commits = 0;
  reads = 0;
  lists: string[] = [];
  retryAfterFirstAttempt?: () => void;
  private tail: Promise<void> = Promise.resolve();

  async get(path: string): Promise<GrowthCommercialStoredDocument | null> {
    this.reads += 1;
    if (!this.documents.has(path)) return null;
    return { path, data: copy(this.documents.get(path)) };
  }

  async list(path: string): Promise<GrowthCommercialStoredDocument[]> {
    this.lists.push(path);
    return [...this.documents.entries()]
      .filter(([key]) => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1)
      .map(([key, data]) => ({ path: key, data: copy(data) }));
  }

  serverTimestamp(): unknown {
    return SERVER_TIME;
  }

  runTransaction<T>(operation: (transaction: GrowthCommercialFirestoreTransaction) => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      this.transactions += 1;
      const pending = new Map<string, Record<string, unknown>>();
      const transaction: GrowthCommercialFirestoreTransaction = {
        get: path => this.get(path),
        set: (path, data) => { pending.set(path, data); },
      };
      let outcome = await operation(transaction);
      if (this.retryAfterFirstAttempt) {
        const compete = this.retryAfterFirstAttempt;
        this.retryAfterFirstAttempt = undefined;
        pending.clear();
        compete();
        outcome = await operation(transaction);
      }
      for (const [path, data] of pending) this.documents.set(path, copy(data, this.now));
      this.commits += 1;
      return outcome;
    });
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

function setup() {
  const store = new FakeFirestore();
  return { store, repository: new FirestoreGrowthCommercialContextRepository(store) };
}

function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) frozen(child);
  }
  return value;
}

describe('Growth commercial paths', () => {
  it('CASE 1: defines a deterministic singleton enterprise at the canonical company path', () => {
    expect(growthEnterpriseContextPath(scope)).toBe(
      'growth_commercial_contexts/company-independent',
    );
    expect(growthEnterpriseContextPath({ ...scope })).toBe(growthEnterpriseContextPath(scope));
    expect(GROWTH_COLLECTIONS.CONVERSATIONS).toBe('growth_conversations');
  });

  it('CASE 2: places an encoded stable product ID below the canonical company', () => {
    expect(growthProductContextPath(scope, 'product-stable')).toBe(
      'growth_commercial_contexts/company-independent/products/id_product-stable',
    );
  });

  it('CASE 4/19/20: company is the only scope key and tenant metadata never changes paths', () => {
    expectTypeOf<GrowthCommercialScope>().toEqualTypeOf<Readonly<{ companyId: string }>>();
    expectTypeOf<keyof GrowthCommercialScope>().toEqualTypeOf<'companyId'>();
    expect(scope).not.toHaveProperty('tenantId');
    for (const tenantId of [TENANT_METADATA, 'another-tenant']) {
      // Structural callers may carry metadata, but path construction must ignore it.
      const withMetadata = { ...scope, tenantId };
      const paths = [
        growthEnterpriseContextPath(withMetadata),
        growthProductContextsPath(withMetadata),
        growthProductContextPath(withMetadata, 'product-stable'),
      ];
      expect(paths).toEqual([
        'growth_commercial_contexts/company-independent',
        'growth_commercial_contexts/company-independent/products',
        'growth_commercial_contexts/company-independent/products/id_product-stable',
      ]);
      for (const path of paths) {
        expect(path).not.toContain('/companies/');
        expect(path).not.toContain(tenantId);
      }
    }
  });

  it('CASE 3: another company produces another path', () => {
    expect(growthEnterpriseContextPath({ ...scope, companyId: 'another' })).not.toBe(growthEnterpriseContextPath(scope));
    expect(growthProductContextPath({ companyId: 'another' }, 'shared-product'))
      .not.toBe(growthProductContextPath(scope, 'shared-product'));
  });

  it.each(['company%2Fcanonical', 'company:canonical', '会社', 'é', 'e\u0301', '😀'])(
    'preserves canonical company ID %j without encoding or normalization', companyId => {
      expect(growthCompanyIdSegment(companyId)).toBe(companyId);
      expect(growthEnterpriseContextPath({ companyId })).toBe('growth_commercial_contexts/' + companyId);
    },
  );

  it('keeps distinct Unicode normalization forms as distinct canonical company IDs', () => {
    expect(growthEnterpriseContextPath({ companyId: 'é' }))
      .not.toBe(growthEnterpriseContextPath({ companyId: 'e\u0301' }));
  });

  it('encodes path separators without collisions and accepts existing product id formats', () => {
    expect(growthCommercialIdSegment('product:tenant:company:a/b')).toBe('id_product%3Atenant%3Acompany%3Aa%2Fb');
    expect(growthCommercialIdSegment('a/b')).not.toBe(growthCommercialIdSegment('a%2Fb'));
    expect(growthCommercialIdSegment('..')).toBe('id_..');
    expect(growthProductContextPath(scope, 'a/b').split('/')).toHaveLength(4);
    for (const id of ['product:tenant:company:a/b', 'a%2Fb', '..', '製品😀']) {
      expect(decodeURIComponent(growthCommercialIdSegment(id).slice(3))).toBe(id);
    }
  });

  it.each(['', ' ', ' padded', 'padded ', 'a'.repeat(1500)])('rejects invalid id %j', id => {
    expect(() => growthCommercialIdSegment(id)).toThrow();
  });
});

describe('Growth commercial repository', () => {
  it('creates enterprise version 1 using server timestamps and a domain ID distinct from companyId', async () => {
    const { store, repository } = setup();
    const input = { ...enterprise(), version: 8 };
    await repository.createEnterpriseContext(scope, input);
    expect(store.transactions).toBe(1);
    expect(input.id).not.toBe(scope.companyId);
    expect(store.documents.get(growthEnterpriseContextPath(scope))).toEqual({
      ...input, version: 1, createdAt: store.now, updatedAt: store.now,
    });
    expect(await repository.readEnterpriseContext(scope)).toEqual({
      ...input, version: 1, createdAt: CREATE_TIME, updatedAt: CREATE_TIME,
    });
  });

  it('creates product version 1 with stable identity and no fabricated fields', async () => {
    const { store, repository } = setup();
    const input = { ...product(), version: 6 };
    await repository.createProductContext(scope, input.id, input);
    expect(store.documents.size).toBe(1);
    expect(await repository.readProductContext(scope, input.id)).toEqual({
      ...input, version: 1, createdAt: CREATE_TIME, updatedAt: CREATE_TIME,
    });
  });

  it('accepts a minimal canonical product from the certified mapper without inventing knowledge', async () => {
    const { repository } = setup();
    const mapped = BusinessProfileCommercialContextMapper.toCommercialContext({
      id: 'session-view', ...scope, tenantId: TENANT_METADATA, person: { userId: 'session-user' },
      products: [{
        id: 'minimal-product', ...scope, tenantId: TENANT_METADATA, status: 'draft', createdAt: INPUT_TIME, updatedAt: INPUT_TIME,
        name: { value: 'Minimal product', status: 'confirmed', confidence: 100, evidenceIds: [], freshness: 'KNOWN' },
      }],
    }, { enterprise: enterprise(), products: [] }, {
      products: [{ id: 'minimal-product', fields: ['name'] }],
    }).products[0];
    await repository.createProductContext(scope, mapped.id, mapped);
    const result = await repository.readProductContext(scope, mapped.id);
    expect(result).toEqual({ ...mapped, createdAt: CREATE_TIME, updatedAt: CREATE_TIME });
    expect(result?.benefits).toEqual({ value: null, status: 'missing', confidence: 0, evidenceIds: [] });
    expect(result).not.toHaveProperty('person');
    expect(result?.name).not.toHaveProperty('freshness');
  });

  it('create is never an upsert, including a second enterprise id in one scope', async () => {
    const { store, repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    await expect(repository.createEnterpriseContext(scope, { ...enterprise(), id: 'different' }))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_ALREADY_EXISTS' });
    await repository.createProductContext(scope, product().id, product());
    await expect(repository.createProductContext(scope, product().id, product()))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_ALREADY_EXISTS' });
    expect(store.documents.size).toBe(2);
    expect(store.commits).toBe(2);
  });

  it('correct expectedVersion advances enterprise and product atomically', async () => {
    const { store, repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    await repository.createProductContext(scope, product().id, product());
    store.now = Timestamp.fromDate(new Date(UPDATE_TIME));
    await repository.updateEnterpriseContext(scope, { ...enterprise(), companyName: field('Updated') }, 1);
    await repository.updateProductContext(scope, product().id, { ...product(), name: field('Updated') }, 1);
    expect(await repository.readEnterpriseContext(scope)).toMatchObject({ version: 2, companyName: field('Updated') });
    expect(await repository.readProductContext(scope, product().id)).toMatchObject({ version: 2, name: field('Updated') });
    expect(store.transactions).toBe(4);
    expect(store.commits).toBe(4);
  });

  it('CASE 12: incorrect expectedVersion causes a distinguishable conflict with no write', async () => {
    const { store, repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    await repository.createProductContext(scope, product().id, product());
    const before = [...store.documents];
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 2)).rejects.toMatchObject({ code: conflictCode });
    await expect(repository.updateProductContext(scope, product().id, product(), 2)).rejects.toMatchObject({ code: conflictCode });
    expect([...store.documents]).toEqual(before);
    expect(store.commits).toBe(2);
  });

  it('CASE 5/9: company mismatch fails on input, stored reads and updates', async () => {
    const { store, repository } = setup();
    const wrong = { ...enterprise(), companyId: 'wrong-scope' };
    const wrongProduct = { ...product(), companyId: 'wrong-scope' };
    await expect(repository.createEnterpriseContext(scope, wrong))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.createProductContext(scope, product().id, wrongProduct))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.updateEnterpriseContext(scope, wrong, 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.updateProductContext(scope, product().id, wrongProduct, 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    expect(store.transactions).toBe(0);
    expect(store.reads).toBe(0);
    store.documents.set(growthEnterpriseContextPath(scope), stored(wrong));
    store.documents.set(growthProductContextPath(scope, product().id), stored(wrongProduct));
    await expect(repository.readEnterpriseContext(scope)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.readProductContext(scope, product().id)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.updateProductContext(scope, product().id, product(), 1)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    expect(store.commits).toBe(0);
  });

  it('CASE 6/7/8/19: preserves independent tenant metadata on create, read and update in one company', async () => {
    const { store, repository } = setup();
    const companyScope = { companyId: 'company-a' };
    const enterpriseInput = { ...enterprise(), ...companyScope, tenantId: 'tenant-z' };
    const productInput = { ...product(), ...companyScope, tenantId: 'tenant-y' };
    await repository.createEnterpriseContext(companyScope, enterpriseInput);
    await repository.createProductContext(companyScope, productInput.id, productInput);
    expect(await repository.readEnterpriseContext(companyScope)).toMatchObject({ tenantId: 'tenant-z', companyId: 'company-a' });
    expect(await repository.readProductContext(companyScope, productInput.id)).toMatchObject({ tenantId: 'tenant-y', companyId: 'company-a' });
    expect([...store.documents.keys()]).toEqual([
      'growth_commercial_contexts/company-a',
      'growth_commercial_contexts/company-a/products/id_product-stable',
    ]);
    store.now = Timestamp.fromDate(new Date(UPDATE_TIME));
    await repository.updateEnterpriseContext(companyScope, { ...enterpriseInput, companyName: field('Updated') }, 1);
    await repository.updateProductContext(companyScope, productInput.id, { ...productInput, name: field('Updated') }, 1);
    expect(await repository.readEnterpriseContext(companyScope)).toMatchObject({ tenantId: 'tenant-z', companyId: 'company-a', version: 2 });
    expect(await repository.readProductContext(companyScope, productInput.id)).toMatchObject({ tenantId: 'tenant-y', companyId: 'company-a', version: 2 });
    expect(store.documents.get(growthEnterpriseContextPath(companyScope))).toMatchObject({ tenantId: 'tenant-z' });
    expect(store.documents.get(growthProductContextPath(companyScope, productInput.id))).toMatchObject({ tenantId: 'tenant-y' });
  });

  it.each(['replacement-tenant', scope.companyId])('CASE 10: rejects replacing stored tenant metadata with %s', async tenantId => {
    const { store, repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    await repository.createProductContext(scope, product().id, product());
    const before = [...store.documents];
    await expect(repository.updateEnterpriseContext(scope, { ...enterprise(), tenantId }, 1))
      .rejects.toMatchObject({ code: invalidCode });
    await expect(repository.updateProductContext(scope, product().id, { ...product(), tenantId }, 1))
      .rejects.toMatchObject({ code: invalidCode });
    expect([...store.documents]).toEqual(before);
    expect(store.commits).toBe(2);
  });

  it('CASE 11: product id mismatch fails on writes, reads, updates and catalog reads', async () => {
    const { store, repository } = setup();
    await expect(repository.createProductContext(scope, 'requested', product()))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH' });
    await expect(repository.updateProductContext(scope, 'requested', product(), 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH' });
    store.documents.set(growthProductContextPath(scope, product().id), stored(product('different')));
    await expect(repository.readProductContext(scope, product().id))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH' });
    await expect(repository.updateProductContext(scope, product().id, product(), 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH' });
    await expect(repository.readProductContexts(scope))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH' });
    expect(store.commits).toBe(0);
  });

  it('CASE 13/14: preserves exact createdAt, controls updatedAt and preserves existing completeness', async () => {
    const { store, repository } = setup();
    const precision = new Timestamp(1788264000, 123456789);
    store.documents.set(growthEnterpriseContextPath(scope), {
      ...stored(enterprise()), createdAt: precision, updatedAt: precision,
    });
    store.now = Timestamp.fromDate(new Date(UPDATE_TIME));
    const input = { ...enterprise(), createdAt: UPDATE_TIME, updatedAt: UPDATE_TIME, completenessScore: 100 };
    await repository.updateEnterpriseContext(scope, input, 1);
    expect(store.documents.get(growthEnterpriseContextPath(scope))).toMatchObject({
      createdAt: precision, updatedAt: store.now, completenessScore: 63, version: 2,
    });
    expect(await repository.readEnterpriseContext(scope)).toMatchObject({
      createdAt: precision.toDate().toISOString(), updatedAt: UPDATE_TIME, completenessScore: 63,
    });
  });

  it('CASE 15: omitted evidence survives updates and new evidence is appended', async () => {
    const { repository } = setup();
    await repository.createProductContext(scope, product().id, product());
    const input = {
      ...product(), evidence: [evidence('new-evidence')],
      name: { ...field('Updated'), evidenceIds: ['new-evidence'] },
    };
    await repository.updateProductContext(scope, input.id, input, 1);
    const result = await repository.readProductContext(scope, input.id);
    expect(result?.evidence).toEqual([evidence(), evidence('new-evidence')]);
    expect(result?.description.evidenceIds).toEqual(['evidence-a']);
    expect(result?.name.evidenceIds).toEqual(['new-evidence']);
    await repository.updateProductContext(scope, input.id, { ...input, evidence: [], version: 2 }, 2);
    expect((await repository.readProductContext(scope, input.id))?.evidence).toEqual([evidence(), evidence('new-evidence')]);
  });

  it('CASE 15: dangling evidenceIds fail on create, update and stored reads', async () => {
    const { store, repository } = setup();
    const input = { ...product(), name: { ...field('Changed'), evidenceIds: ['missing'] } };
    await expect(repository.createProductContext(scope, input.id, input)).rejects.toMatchObject({ code: invalidCode });
    await repository.createProductContext(scope, product().id, product());
    await expect(repository.updateProductContext(scope, input.id, input, 1)).rejects.toMatchObject({ code: invalidCode });
    store.documents.set(growthProductContextPath(scope, input.id), stored(input));
    await expect(repository.readProductContext(scope, input.id)).rejects.toMatchObject({ code: invalidCode });
    expect(store.commits).toBe(1);
  });

  it.each([
    ['missing required field', { companyName: undefined }],
    ['unknown field', { person: { userId: 'session-user' } }],
    ['bad knowledge type', { companyName: field(['not a string']) }],
    ['bad array value', { targetMarkets: field('not an array') }],
    ['bad confidence', { companyName: { ...field('Aura'), confidence: NaN } }],
    ['bad knowledge status', { companyName: { ...field('Aura'), status: 'unknown' } }],
    ['missing with a value', { companyName: { ...field('Aura'), status: 'missing' } }],
    ['session freshness', { companyName: { ...field('Aura'), freshness: 'KNOWN' } }],
    ['bad status', { status: 'deleted' }],
    ['bad evidence source', { evidence: [{ ...evidence(), sourceType: 'fiction' }] }],
    ['bad evidence time', { evidence: [{ ...evidence(), capturedAt: 'yesterday' }] }],
    ['bad evidence array', { evidence: null }],
    ['bad score', { completenessScore: 101 }],
    ['bad version', { version: 1.2 }],
    ['bad timestamp', { createdAt: INPUT_TIME }],
    ['pending timestamp', { updatedAt: null }],
    ['reversed timestamps', { updatedAt: Timestamp.fromDate(new Date(INPUT_TIME)) }],
    ['empty identity', { id: '' }],
    ['missing tenant metadata', { tenantId: undefined }],
    ['empty tenant metadata', { tenantId: '' }],
    ['invalid company segment', { companyId: 'company/other' }],
  ])('rejects malformed Firestore data: %s', async (_label, overrides) => {
    const { store, repository } = setup();
    store.documents.set(growthEnterpriseContextPath(scope), { ...stored(enterprise()), ...overrides });
    await expect(repository.readEnterpriseContext(scope)).rejects.toMatchObject({ code: invalidCode });
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1)).rejects.toMatchObject({ code: invalidCode });
    expect(store.commits).toBe(0);
  });

  it('CASE 16: catalog reads only the exact company, including different tenant metadata, in deterministic id order', async () => {
    const { store, repository } = setup();
    const anotherCompany = { companyId: scope.companyId + '-other' };
    await repository.createProductContext(scope, 'z', product('z'));
    await repository.createProductContext(scope, 'a', product('a'));
    await repository.createProductContext(scope, 'b', { ...product('b'), tenantId: 'other-tenant' });
    await repository.createProductContext(anotherCompany, 'a', { ...product('a'), ...anotherCompany });
    const catalog = await repository.readProductContexts(scope);
    expect(catalog.map(item => item.id)).toEqual(['a', 'b', 'z']);
    expect(catalog[1].tenantId).toBe('other-tenant');
    expect(store.lists).toEqual([growthProductContextsPath(scope)]);
    // A poisoned document within the requested collection rejects the whole result.
    store.documents.set(growthProductContextPath(scope, 'poisoned'), stored({ ...product('poisoned'), ...anotherCompany }));
    await expect(repository.readProductContexts(scope)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
  });

  it('does not mutate inputs and snapshots them before asynchronous work/retries', async () => {
    const { repository } = setup();
    const immutable = frozen(enterprise());
    await repository.createEnterpriseContext(frozen({ ...scope }), immutable);
    await repository.updateEnterpriseContext(scope, immutable, 1);
    expect(immutable).toEqual(enterprise());
    const input = product();
    const pending = repository.createProductContext(scope, input.id, input);
    input.name.value = 'Caller mutation';
    input.evidence.length = 0;
    await pending;
    const result = await repository.readProductContext(scope, product().id);
    expect(result?.name.value).toBe('Aura HCM');
    expect(result?.evidence).toEqual([evidence()]);
  });

  it('rejects conflicting duplicate evidence and deduplicates identical records', async () => {
    const { store, repository } = setup();
    await expect(repository.createEnterpriseContext(scope, {
      ...enterprise(), evidence: [evidence(), { ...evidence(), label: 'Conflicting' }],
    })).rejects.toMatchObject({ code: invalidCode });
    await repository.createEnterpriseContext(scope, { ...enterprise(), evidence: [evidence(), evidence()] });
    await expect(repository.updateEnterpriseContext(scope, {
      ...enterprise(), evidence: [{ ...evidence(), label: 'Changed meaning' }],
    }, 1)).rejects.toMatchObject({ code: invalidCode });
    expect((await repository.readEnterpriseContext(scope))?.evidence).toEqual([evidence()]);
    expect(store.commits).toBe(1);
  });

  it('refuses changing the enterprise identity and never creates missing entities during update', async () => {
    const { store, repository } = setup();
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_NOT_FOUND' });
    await expect(repository.updateProductContext(scope, product().id, product(), 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_NOT_FOUND' });
    await repository.createEnterpriseContext(scope, enterprise());
    await expect(repository.updateEnterpriseContext(scope, { ...enterprise(), id: 'changed-id' }, 1))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH' });
    expect(store.commits).toBe(1);
  });

  it('allows only one winner for concurrent creates and concurrent versioned updates', async () => {
    const { store, repository } = setup();
    const creates = await Promise.allSettled([
      repository.createProductContext(scope, product().id, product()),
      repository.createProductContext(scope, product().id, product()),
    ]);
    expect(creates.map(item => item.status)).toEqual(['fulfilled', 'rejected']);
    const updates = await Promise.allSettled([
      repository.updateProductContext(scope, product().id, product(), 1),
      repository.updateProductContext(scope, product().id, product(), 1),
    ]);
    expect(updates.map(item => item.status)).toEqual(['fulfilled', 'rejected']);
    expect(updates[1]).toMatchObject({ reason: { code: conflictCode } });
    expect((await repository.readProductContext(scope, product().id))?.version).toBe(2);
    expect(store.commits).toBe(2);
  });

  it('does not change expectedVersion when Firestore retries a contended transaction', async () => {
    const { store, repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    const path = growthEnterpriseContextPath(scope);
    const competitor = { ...stored(enterprise()), version: 2, companyName: field('Competing writer') };
    store.retryAfterFirstAttempt = () => { store.documents.set(path, competitor); };
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1)).rejects.toMatchObject({ code: conflictCode });
    expect(store.documents.get(path)).toEqual(competitor);
    expect(store.commits).toBe(1);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, undefined])('rejects invalid expectedVersion %s', async value => {
    const { store, repository } = setup();
    // Reflect.apply deliberately probes runtime input validation beyond static types.
    await expect(Reflect.apply(repository.updateEnterpriseContext, repository, [scope, enterprise(), value]))
      .rejects.toMatchObject({ code: invalidCode });
    expect(store.transactions).toBe(0);
  });

  it('rejects a stale entity even if supplied with a current expectedVersion', async () => {
    const { repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    await repository.updateEnterpriseContext(scope, enterprise(), 1);
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 2)).rejects.toMatchObject({ code: conflictCode });
  });

  it('returns null/empty only for absent documents, and propagates storage failures', async () => {
    const { store, repository } = setup();
    expect(await repository.readEnterpriseContext(scope)).toBeNull();
    expect(await repository.readProductContext(scope, 'absent')).toBeNull();
    expect(await repository.readProductContexts(scope)).toEqual([]);
    const denied = new Error('permission-denied');
    vi.spyOn(store, 'get').mockRejectedValue(denied);
    await expect(repository.readEnterpriseContext(scope)).rejects.toBe(denied);
    vi.spyOn(store, 'list').mockRejectedValue(denied);
    await expect(repository.readProductContexts(scope)).rejects.toBe(denied);
  });

  it.each([
    ['empty', ''], ['blank', ' '], ['leading whitespace', ' padded'], ['trailing whitespace', 'padded '],
    ['path separator', 'company/other'], ['dot', '.'], ['dot-dot', '..'],
    ['reserved', '__company__'], ['reserved with newline', '__company\nother__'],
    ['unpaired high surrogate', '\uD800'], ['unpaired low surrogate', '\uDC00'],
    ['too many ASCII bytes', 'a'.repeat(1501)], ['too many UTF-8 bytes', 'é'.repeat(751)],
    ['too many four-byte code points', '😀'.repeat(376)],
    ['missing', undefined], ['null', null], ['nonstring', 42],
  ])('CASE 17: rejects invalid company ID (%s) before any storage I/O', async (_label, companyId) => {
    const { store, repository } = setup();
    const invalidScope = { companyId };
    expect(() => Reflect.apply(growthEnterpriseContextPath, undefined, [invalidScope])).toThrow();
    expect(() => Reflect.apply(growthProductContextPath, undefined, [invalidScope, product().id])).toThrow();
    // Reflect.apply deliberately probes runtime inputs beyond the company-only type.
    const operations = [
      () => Reflect.apply(repository.readEnterpriseContext, repository, [invalidScope]),
      () => Reflect.apply(repository.readProductContexts, repository, [invalidScope]),
      () => Reflect.apply(repository.readProductContext, repository, [invalidScope, product().id]),
      () => Reflect.apply(repository.createEnterpriseContext, repository, [invalidScope, enterprise()]),
      () => Reflect.apply(repository.updateEnterpriseContext, repository, [invalidScope, enterprise(), 1]),
      () => Reflect.apply(repository.createProductContext, repository, [invalidScope, product().id, product()]),
      () => Reflect.apply(repository.updateProductContext, repository, [invalidScope, product().id, product(), 1]),
    ];
    for (const operation of operations) await expect(operation()).rejects.toMatchObject({ code: invalidCode });
    expect(store.reads).toBe(0);
    expect(store.lists).toHaveLength(0);
    expect(store.transactions).toBe(0);
    expect(store.documents.size).toBe(0);
  });

  it.each([
    ['ASCII', 'a'.repeat(1500)], ['two-byte Unicode', 'é'.repeat(750)], ['four-byte Unicode', '😀'.repeat(375)],
  ])('accepts a canonical company ID at the 1500-byte limit (%s)', async (_label, companyId) => {
    const { repository } = setup();
    const boundaryScope = { companyId };
    const input = { ...enterprise(), companyId };
    expect(growthEnterpriseContextPath(boundaryScope)).toBe('growth_commercial_contexts/' + companyId);
    await repository.createEnterpriseContext(boundaryScope, input);
    expect(await repository.readEnterpriseContext(boundaryScope)).toMatchObject({ companyId, tenantId: TENANT_METADATA });
  });

  it.each([
    ['empty', ''], ['blank', ' '], ['leading whitespace', ' padded'], ['trailing whitespace', 'padded '],
    ['too long when encoded', 'a'.repeat(1500)], ['unpaired surrogate', '\uD800'],
    ['missing', undefined], ['null', null], ['nonstring', 42],
  ])('CASE 18: rejects invalid product ID (%s) before storage I/O', async (_label, productId) => {
    const { store, repository } = setup();
    await expect(Reflect.apply(repository.readProductContext, repository, [scope, productId]))
      .rejects.toMatchObject({ code: invalidCode });
    await expect(Reflect.apply(repository.createProductContext, repository, [scope, productId, product()]))
      .rejects.toMatchObject({ code: invalidCode });
    await expect(Reflect.apply(repository.updateProductContext, repository, [scope, productId, product(), 1]))
      .rejects.toMatchObject({ code: invalidCode });
    expect(store.reads).toBe(0);
    expect(store.lists).toHaveLength(0);
    expect(store.transactions).toBe(0);
  });

  it.each(['', ' ', ' padded', 'padded '])('still rejects invalid tenant metadata %j without using it as a scope', async tenantId => {
    const { store, repository } = setup();
    await expect(repository.createEnterpriseContext(scope, { ...enterprise(), tenantId }))
      .rejects.toMatchObject({ code: invalidCode });
    await expect(repository.createProductContext(scope, product().id, { ...product(), tenantId }))
      .rejects.toMatchObject({ code: invalidCode });
    await expect(repository.updateEnterpriseContext(scope, { ...enterprise(), tenantId }, 1))
      .rejects.toMatchObject({ code: invalidCode });
    await expect(repository.updateProductContext(scope, product().id, { ...product(), tenantId }, 1))
      .rejects.toMatchObject({ code: invalidCode });
    expect(store.reads).toBe(0);
    expect(store.transactions).toBe(0);
    store.documents.set(growthProductContextPath(scope, product().id), stored({ ...product(), tenantId }));
    await expect(repository.readProductContext(scope, product().id)).rejects.toMatchObject({ code: invalidCode });
    await expect(repository.readProductContexts(scope)).rejects.toMatchObject({ code: invalidCode });
    expect(store.commits).toBe(0);
  });

  it('rejects mismatched snapshot paths without returning any foreign document', async () => {
    const { store, repository } = setup();
    vi.spyOn(store, 'get').mockResolvedValue({ path: 'foreign/path', data: stored(enterprise()) });
    await expect(repository.readEnterpriseContext(scope)).rejects.toMatchObject({
      code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH',
    });
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1)).rejects.toMatchObject({
      code: 'GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH',
    });
  });
});

describe('Firestore SDK composition without network', () => {
  const app = initializeApp({ projectId: 'growth-commercial-unit-test' }, 'growth-commercial-unit-test');
  const database = getFirestore(app);
  afterAll(() => deleteApp(app));

  it('constructs without I/O and uses explicit server reads', async () => {
    sdk.get.mockClear();
    sdk.list.mockClear();
    sdk.transaction.mockClear();
    const repository = createGrowthCommercialContextRepository(database);
    expect(sdk.get).not.toHaveBeenCalled();
    expect(sdk.list).not.toHaveBeenCalled();
    expect(sdk.transaction).not.toHaveBeenCalled();
    sdk.get.mockResolvedValue({ exists: () => true, ref: { path: growthEnterpriseContextPath(scope) }, data: () => stored(enterprise()) });
    expect((await repository.readEnterpriseContext(scope))?.id).toBe(enterprise().id);
    expect(sdk.get.mock.calls[0][0].path).toBe(growthEnterpriseContextPath(scope));
    sdk.list.mockResolvedValue({ docs: [] });
    expect(await repository.readProductContexts(scope)).toEqual([]);
    expect(sdk.list).toHaveBeenCalledOnce();
  });

  it('bridges writes through runTransaction and serverTimestamp transforms', async () => {
    const write = vi.fn();
    sdk.transaction.mockImplementation(async (_database: unknown, operation: (transaction: {
      get: (reference: DocumentReference) => Promise<{ exists(): boolean }>;
      set: typeof write;
    }) => Promise<void>) => operation({
      get: async () => ({ exists: () => false }),
      set: write,
    }));
    const repository = createGrowthCommercialContextRepository(database);
    await repository.createEnterpriseContext(scope, enterprise());
    expect(write).toHaveBeenCalledOnce();
    const [reference, data] = write.mock.calls[0];
    expect(reference.path).toBe(growthEnterpriseContextPath(scope));
    expect(data.version).toBe(1);
    expect(data.createdAt).toBe(data.updatedAt);
    expect(typeof data.updatedAt.isEqual).toBe('function');
    expect(data.updatedAt).not.toBe(INPUT_TIME);
  });
});
