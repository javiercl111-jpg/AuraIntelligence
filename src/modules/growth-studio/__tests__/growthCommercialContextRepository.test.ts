import { afterAll, describe, expect, it, vi } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { getFirestore, Timestamp, type DocumentReference } from 'firebase/firestore';

import {
  GROWTH_COLLECTIONS, growthCommercialIdSegment, growthEnterpriseContextPath,
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

const scope: GrowthCommercialScope = { tenantId: 'tenant-independent', companyId: 'company-independent' };
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
    ...scope, evidence: [evidence()], status: 'draft' as const, version: 1,
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
  it('CASE 1: defines a deterministic singleton enterprise and stable product path', () => {
    expect(growthEnterpriseContextPath(scope)).toBe(
      'growth_commercial_contexts/id_tenant-independent/companies/id_company-independent',
    );
    expect(growthEnterpriseContextPath({ ...scope })).toBe(growthEnterpriseContextPath(scope));
    expect(growthProductContextPath(scope, 'product-stable')).toBe(
      growthProductContextsPath(scope) + '/id_product-stable',
    );
    expect(GROWTH_COLLECTIONS.CONVERSATIONS).toBe('growth_conversations');
  });

  it('CASE 2: another tenant produces another path', () => {
    expect(growthEnterpriseContextPath({ ...scope, tenantId: 'another' })).not.toBe(growthEnterpriseContextPath(scope));
  });

  it('CASE 3: another company produces another path', () => {
    expect(growthEnterpriseContextPath({ ...scope, companyId: 'another' })).not.toBe(growthEnterpriseContextPath(scope));
    expect(growthEnterpriseContextPath({ tenantId: scope.companyId, companyId: scope.tenantId }))
      .not.toBe(growthEnterpriseContextPath(scope));
  });

  it('encodes path separators without collisions and accepts existing product id formats', () => {
    expect(growthCommercialIdSegment('product:tenant:company:a/b')).toBe('id_product%3Atenant%3Acompany%3Aa%2Fb');
    expect(growthCommercialIdSegment('a/b')).not.toBe(growthCommercialIdSegment('a%2Fb'));
    expect(growthCommercialIdSegment('..')).toBe('id_..');
    expect(growthProductContextPath(scope, 'a/b').split('/')).toHaveLength(6);
  });

  it.each(['', ' ', ' padded', 'padded ', 'a'.repeat(1500)])('rejects invalid id %j', id => {
    expect(() => growthCommercialIdSegment(id)).toThrow();
  });
});

describe('Growth commercial repository', () => {
  it('CASE 4: creates enterprise version 1 using server timestamps', async () => {
    const { store, repository } = setup();
    const input = { ...enterprise(), version: 8 };
    await repository.createEnterpriseContext(scope, input);
    expect(store.transactions).toBe(1);
    expect(store.documents.get(growthEnterpriseContextPath(scope))).toEqual({
      ...input, version: 1, createdAt: store.now, updatedAt: store.now,
    });
    expect(await repository.readEnterpriseContext(scope)).toEqual({
      ...input, version: 1, createdAt: CREATE_TIME, updatedAt: CREATE_TIME,
    });
  });

  it('CASE 5: creates product version 1 with stable identity and no fabricated fields', async () => {
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
      id: 'session-view', ...scope, person: { userId: 'session-user' },
      products: [{
        id: 'minimal-product', ...scope, status: 'draft', createdAt: INPUT_TIME, updatedAt: INPUT_TIME,
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

  it('CASE 6: create is never an upsert, including a second enterprise id in one scope', async () => {
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

  it('CASE 7: correct expectedVersion advances enterprise and product atomically', async () => {
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

  it('CASE 8: incorrect expectedVersion causes a distinguishable conflict with no write', async () => {
    const { store, repository } = setup();
    await repository.createEnterpriseContext(scope, enterprise());
    await repository.createProductContext(scope, product().id, product());
    const before = [...store.documents];
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 2)).rejects.toMatchObject({ code: conflictCode });
    await expect(repository.updateProductContext(scope, product().id, product(), 2)).rejects.toMatchObject({ code: conflictCode });
    expect([...store.documents]).toEqual(before);
    expect(store.commits).toBe(2);
  });

  it.each(['tenantId', 'companyId'] as const)('CASE 9/10: %s mismatch fails on input, stored reads and updates', async key => {
    const { store, repository } = setup();
    const wrong = { ...enterprise(), [key]: 'wrong-scope' };
    await expect(repository.createEnterpriseContext(scope, wrong))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.createProductContext(scope, product().id, { ...product(), [key]: 'wrong-scope' }))
      .rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    expect(store.transactions).toBe(0);
    store.documents.set(growthEnterpriseContextPath(scope), stored(wrong));
    store.documents.set(growthProductContextPath(scope, product().id), stored({ ...product(), [key]: 'wrong-scope' }));
    await expect(repository.readEnterpriseContext(scope)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.readProductContext(scope, product().id)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    await expect(repository.updateProductContext(scope, product().id, product(), 1)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
    expect(store.commits).toBe(0);
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

  it('CASE 12/13: preserves exact createdAt, controls updatedAt and preserves existing completeness', async () => {
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

  it('CASE 14: omitted evidence survives updates and new evidence is appended', async () => {
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
  ])('CASE 16: rejects malformed Firestore data: %s', async (_label, overrides) => {
    const { store, repository } = setup();
    store.documents.set(growthEnterpriseContextPath(scope), { ...stored(enterprise()), ...overrides });
    await expect(repository.readEnterpriseContext(scope)).rejects.toMatchObject({ code: invalidCode });
    await expect(repository.updateEnterpriseContext(scope, enterprise(), 1)).rejects.toMatchObject({ code: invalidCode });
    expect(store.commits).toBe(0);
  });

  it('CASE 17: catalog reads only the exact scope, in deterministic id order', async () => {
    const { store, repository } = setup();
    const anotherTenant = { ...scope, tenantId: 'other-tenant' };
    const anotherCompany = { ...scope, companyId: 'other-company' };
    await repository.createProductContext(scope, 'z', product('z'));
    await repository.createProductContext(scope, 'a', product('a'));
    await repository.createProductContext(anotherTenant, 'hidden-tenant', { ...product('hidden-tenant'), ...anotherTenant });
    await repository.createProductContext(anotherCompany, 'hidden-company', { ...product('hidden-company'), ...anotherCompany });
    expect((await repository.readProductContexts(scope)).map(item => item.id)).toEqual(['a', 'z']);
    expect(store.lists).toEqual([growthProductContextsPath(scope)]);
    // A poisoned document within the requested collection rejects the whole result.
    store.documents.set(growthProductContextPath(scope, 'poisoned'), stored({ ...product('poisoned'), ...anotherTenant }));
    await expect(repository.readProductContexts(scope)).rejects.toMatchObject({ code: 'GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH' });
  });

  it('CASE 18: does not mutate inputs and snapshots them before asynchronous work/retries', async () => {
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

  it.each(['tenantId', 'companyId'] as const)('rejects empty %s before storage access', async key => {
    const { store, repository } = setup();
    const emptyScope = { ...scope, [key]: '' };
    await expect(repository.readEnterpriseContext(emptyScope)).rejects.toMatchObject({ code: invalidCode });
    await expect(repository.readProductContexts(emptyScope)).rejects.toMatchObject({ code: invalidCode });
    await expect(repository.createProductContext(emptyScope, product().id, product())).rejects.toMatchObject({ code: invalidCode });
    expect(store.reads).toBe(0);
    expect(store.lists).toHaveLength(0);
    expect(store.transactions).toBe(0);
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
