import {
  collection, doc, documentId, getDocFromServer, getDocsFromServer, orderBy, query,
  runTransaction, serverTimestamp, Timestamp, type Firestore,
} from 'firebase/firestore';

import {
  growthCommercialIdSegment, growthCompanyIdSegment, growthEnterpriseContextPath,
  growthProductContextPath, growthProductContextsPath,
} from '../config/growthStudioCollections';
import type {
  CommercialEvidence, CommercialKnowledgeField, EnterpriseCommercialContext, ProductContext,
} from '../types/growthCommercialContext';
import {
  GrowthCommercialContextRepositoryError,
  type GrowthCommercialScope, type IGrowthCommercialContextRepository,
} from './contracts/IGrowthCommercialContextRepository';

export interface GrowthCommercialStoredDocument {
  readonly path: string;
  readonly data: unknown;
}

/** Minimal injected primitives for deterministic offline tests; not a domain API. */
export interface GrowthCommercialFirestoreTransaction {
  get(path: string): Promise<GrowthCommercialStoredDocument | null>;
  set(path: string, data: Record<string, unknown>): void;
}

export interface GrowthCommercialFirestorePort {
  get(path: string): Promise<GrowthCommercialStoredDocument | null>;
  list(collectionPath: string): Promise<readonly GrowthCommercialStoredDocument[]>;
  runTransaction<T>(operation: (transaction: GrowthCommercialFirestoreTransaction) => Promise<T>): Promise<T>;
  serverTimestamp(): unknown;
}

type Context = EnterpriseCommercialContext | ProductContext;
type Format = 'domain' | 'storage';
type Parser<T extends Context> = (
  value: unknown, scope: GrowthCommercialScope, format: Format, checkEvidence?: boolean,
) => T;

function invalid(message: string): never {
  throw new GrowthCommercialContextRepositoryError('GROWTH_COMMERCIAL_CONTEXT_INVALID_DATA', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return invalid('Expected a plain commercial context record');
  return value;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) invalid('Unexpected commercial context field');
}

function identifier(value: unknown): string {
  if (typeof value !== 'string') return invalid('Invalid identifier');
  try {
    growthCommercialIdSegment(value);
  } catch {
    return invalid('Invalid identifier');
  }
  return value;
}

function companyIdentifier(value: unknown): string {
  if (typeof value !== 'string') return invalid('Invalid company identifier');
  try {
    return growthCompanyIdSegment(value);
  } catch {
    return invalid('Invalid company identifier');
  }
}

function checkedScope(scope: GrowthCommercialScope): GrowthCommercialScope {
  const input = record(scope);
  return { companyId: companyIdentifier(input.companyId) };
}

function assertScope(scope: GrowthCommercialScope, actual: GrowthCommercialScope): void {
  if (scope.companyId !== actual.companyId) {
    throw new GrowthCommercialContextRepositoryError('GROWTH_COMMERCIAL_CONTEXT_SCOPE_MISMATCH', 'Company mismatch');
  }
}

function assertIdentity(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new GrowthCommercialContextRepositoryError('GROWTH_COMMERCIAL_CONTEXT_IDENTITY_MISMATCH', 'Document identity mismatch');
  }
}

function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  const match = choices.find(candidate => candidate === value);
  if (match === undefined) return invalid('Invalid commercial context status or source');
  return match;
}

function percent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    return invalid('Expected a finite percentage');
  }
  return value;
}

function version(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    return invalid('Expected a positive safe integer version');
  }
  return value;
}

/** Canonical domain dates use normalized UTC ISO strings, matching existing mappers. */
function iso(value: unknown): string {
  if (typeof value !== 'string') return invalid('Expected an ISO timestamp');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) return invalid('Invalid ISO timestamp');
  return value;
}

function timestamp(value: unknown, format: Format): string {
  if (format === 'domain') return iso(value);
  if (!(value instanceof Timestamp)) return invalid('Expected a committed Firestore Timestamp');
  return iso(value.toDate().toISOString());
}

function textValue(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return invalid('Expected nonempty text');
  return value;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return invalid('Expected an array');
  return value.map(textValue);
}

function knowledge<T>(value: unknown, parseValue: (input: unknown) => T): CommercialKnowledgeField<T> {
  const input = record(value);
  exactKeys(input, ['value', 'status', 'confidence', 'evidenceIds']);
  const status = choice(input.status, ['confirmed', 'inferred', 'missing'] as const);
  const confidence = percent(input.confidence);
  const evidenceIds = strings(input.evidenceIds).map(identifier);
  if (status === 'missing') {
    if (input.value !== null || confidence !== 0 || evidenceIds.length !== 0) {
      return invalid('Missing knowledge contains a value or support');
    }
    return { value: null, status, confidence, evidenceIds };
  }
  return { value: parseValue(input.value), status, confidence, evidenceIds };
}

function parseEvidence(value: unknown): CommercialEvidence[] {
  if (!Array.isArray(value)) return invalid('Expected evidence array');
  const entries = value.map(item => {
    const input = record(item);
    exactKeys(input, ['id', 'sourceType', 'sourceRef', 'label', 'capturedAt']);
    const entry: CommercialEvidence = {
      id: identifier(input.id),
      sourceType: choice(input.sourceType, [
        'user', 'company_website', 'company_document', 'product_document',
        'intelligence', 'control_center', 'other',
      ] as const),
      label: textValue(input.label),
      capturedAt: iso(input.capturedAt),
    };
    if (input.sourceRef !== undefined) return { ...entry, sourceRef: textValue(input.sourceRef) };
    return entry;
  });
  return mergeEvidence([], entries);
}

function mergeEvidence(current: readonly CommercialEvidence[], incoming: readonly CommercialEvidence[]): CommercialEvidence[] {
  const byId = new Map(current.map(entry => [entry.id, { ...entry }]));
  for (const entry of incoming) {
    const previous = byId.get(entry.id);
    if (previous && (
      previous.sourceType !== entry.sourceType || previous.sourceRef !== entry.sourceRef ||
      previous.label !== entry.label || previous.capturedAt !== entry.capturedAt
    )) return invalid('Conflicting evidence records share an id');
    if (!previous) byId.set(entry.id, { ...entry });
  }
  return [...byId.values()];
}

function assertEvidence(fields: CommercialKnowledgeField<unknown>[], evidence: CommercialEvidence[]): void {
  const ids = new Set(evidence.map(entry => entry.id));
  if (fields.some(field => field.evidenceIds.some(id => !ids.has(id)))) invalid('Dangling evidence reference');
}

function base(input: Record<string, unknown>, scope: GrowthCommercialScope, format: Format) {
  const identity = { id: identifier(input.id), tenantId: identifier(input.tenantId), companyId: companyIdentifier(input.companyId) };
  assertScope(scope, identity);
  const createdAt = timestamp(input.createdAt, format);
  const updatedAt = timestamp(input.updatedAt, format);
  if (updatedAt < createdAt) return invalid('updatedAt precedes createdAt');
  return {
    ...identity,
    evidence: parseEvidence(input.evidence),
    status: choice(input.status, ['draft', 'active', 'archived'] as const),
    completenessScore: percent(input.completenessScore),
    version: version(input.version),
    createdAt, updatedAt,
  };
}

function parseEnterprise(
  value: unknown, scope: GrowthCommercialScope, format: Format, checkEvidence = true,
): EnterpriseCommercialContext {
  const input = record(value);
  const metadata = base(input, scope, format);
  const fields = {
    companyName: knowledge(input.companyName, textValue),
    businessDescription: knowledge(input.businessDescription, textValue),
    industry: knowledge(input.industry, textValue),
    valueProposition: knowledge(input.valueProposition, textValue),
    differentiators: knowledge(input.differentiators, strings),
    targetMarkets: knowledge(input.targetMarkets, strings),
    brandTone: knowledge(input.brandTone, textValue),
    communicationStyle: knowledge(input.communicationStyle, textValue),
    businessGoals: knowledge(input.businessGoals, strings),
  };
  const result = { ...metadata, ...fields };
  exactKeys(input, Object.keys(result));
  if (checkEvidence) assertEvidence(Object.values(fields), metadata.evidence);
  return result;
}

function parseProduct(
  value: unknown, scope: GrowthCommercialScope, format: Format, checkEvidence = true,
): ProductContext {
  const input = record(value);
  const metadata = base(input, scope, format);
  const fields = {
    name: knowledge(input.name, textValue),
    category: knowledge(input.category, textValue),
    description: knowledge(input.description, textValue),
    problemsSolved: knowledge(input.problemsSolved, strings),
    capabilities: knowledge(input.capabilities, strings),
    benefits: knowledge(input.benefits, strings),
    differentiators: knowledge(input.differentiators, strings),
    idealCustomerProfiles: knowledge(input.idealCustomerProfiles, strings),
    targetIndustries: knowledge(input.targetIndustries, strings),
    useCases: knowledge(input.useCases, strings),
    pricingContext: knowledge(input.pricingContext, textValue),
    commercialEvidence: knowledge(input.commercialEvidence, strings),
    claimsRestrictions: knowledge(input.claimsRestrictions, strings),
    preferredMessages: knowledge(input.preferredMessages, strings),
    websiteUrl: knowledge(input.websiteUrl, textValue),
  };
  const result = { ...metadata, ...fields };
  exactKeys(input, Object.keys(result));
  if (checkEvidence) assertEvidence(Object.values(fields), metadata.evidence);
  return result;
}

/**
 * Explicit injection only. Never imports src/firebase.ts, creates a client, or
 * enables cross-conversation loading. Tests of this class do not verify rules.
 * Storage dates are server transforms; pending/null/local string dates fail closed.
 * COMPLETENESS_RECALCULATION=DEFERRED: no shared domain score policy exists.
 */
export class FirestoreGrowthCommercialContextRepository implements IGrowthCommercialContextRepository {
  private readonly store: GrowthCommercialFirestorePort;

  constructor(store: GrowthCommercialFirestorePort) {
    this.store = store;
  }

  private async read<T extends Context>(
    path: string, scope: GrowthCommercialScope, parse: Parser<T>,
  ): Promise<T | null> {
    const snapshot = await this.store.get(path);
    if (snapshot === null) return null;
    assertIdentity(path, snapshot.path);
    return parse(snapshot.data, scope, 'storage');
  }

  async readEnterpriseContext(scope: GrowthCommercialScope): Promise<EnterpriseCommercialContext | null> {
    const safeScope = checkedScope(scope);
    return this.read(growthEnterpriseContextPath(safeScope), safeScope, parseEnterprise);
  }

  async readProductContext(scope: GrowthCommercialScope, productId: string): Promise<ProductContext | null> {
    const safeScope = checkedScope(scope);
    const id = identifier(productId);
    const result = await this.read(growthProductContextPath(safeScope, id), safeScope, parseProduct);
    if (result !== null) assertIdentity(id, result.id);
    return result;
  }

  async readProductContexts(scope: GrowthCommercialScope): Promise<ProductContext[]> {
    const safeScope = checkedScope(scope);
    const snapshots = await this.store.list(growthProductContextsPath(safeScope));
    const ids = new Set<string>();
    const products = snapshots.map(snapshot => {
      const context = parseProduct(snapshot.data, safeScope, 'storage');
      assertIdentity(growthProductContextPath(safeScope, context.id), snapshot.path);
      if (ids.has(context.id)) return invalid('Duplicate product document');
      ids.add(context.id);
      return context;
    });
    // Match Firestore documentId ordering, independent of locale or adapter order.
    return products.sort((left, right) => {
      const a = growthCommercialIdSegment(left.id);
      const b = growthCommercialIdSegment(right.id);
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
  }

  private async write<T extends Context>(
    path: string, scope: GrowthCommercialScope, entity: T, parse: Parser<T>, expectedVersion?: number,
  ): Promise<void> {
    // Snapshot and validate before the first await; retries never reread caller state.
    const candidate = parse(entity, scope, 'domain', false);
    if (expectedVersion !== undefined) {
      version(expectedVersion);
      if (expectedVersion === Number.MAX_SAFE_INTEGER) invalid('Version cannot be incremented safely');
    }
    await this.store.runTransaction(async transaction => {
      const stored = await transaction.get(path);
      if (stored !== null) assertIdentity(path, stored.path);
      if (expectedVersion === undefined) {
        if (stored !== null) {
          parse(stored.data, scope, 'storage');
          throw new GrowthCommercialContextRepositoryError('GROWTH_COMMERCIAL_CONTEXT_ALREADY_EXISTS', 'Create requires an absent document');
        }
        const created = parse({ ...candidate, version: 1 }, scope, 'domain');
        const commitTime = this.store.serverTimestamp();
        transaction.set(path, { ...created, createdAt: commitTime, updatedAt: commitTime });
        return;
      }
      if (stored === null) {
        throw new GrowthCommercialContextRepositoryError('GROWTH_COMMERCIAL_CONTEXT_NOT_FOUND', 'Update requires an existing document');
      }
      const current = parse(stored.data, scope, 'storage');
      assertIdentity(current.id, candidate.id);
      // Immutable metadata, not an authorization or path condition.
      if (current.tenantId !== candidate.tenantId) invalid('Tenant metadata cannot change during update');
      if (current.version !== expectedVersion || candidate.version !== expectedVersion) {
        throw new GrowthCommercialContextRepositoryError('GROWTH_COMMERCIAL_CONTEXT_VERSION_CONFLICT', 'Expected version does not match current context');
      }
      const updated = parse({
        ...candidate,
        evidence: mergeEvidence(current.evidence, candidate.evidence),
        version: expectedVersion + 1,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
        completenessScore: current.completenessScore,
      }, scope, 'domain');
      transaction.set(path, {
        ...updated,
        // Keep the exact stored Timestamp, including sub-millisecond precision.
        createdAt: record(stored.data).createdAt,
        updatedAt: this.store.serverTimestamp(),
      });
    });
  }

  async createEnterpriseContext(scope: GrowthCommercialScope, context: EnterpriseCommercialContext): Promise<void> {
    const safeScope = checkedScope(scope);
    return this.write(growthEnterpriseContextPath(safeScope), safeScope, context, parseEnterprise);
  }

  async updateEnterpriseContext(
    scope: GrowthCommercialScope, context: EnterpriseCommercialContext, expectedVersion: number,
  ): Promise<void> {
    const safeScope = checkedScope(scope);
    version(expectedVersion);
    return this.write(growthEnterpriseContextPath(safeScope), safeScope, context, parseEnterprise, expectedVersion);
  }

  async createProductContext(scope: GrowthCommercialScope, productId: string, context: ProductContext): Promise<void> {
    const safeScope = checkedScope(scope);
    const id = identifier(productId);
    assertIdentity(id, identifier(context.id));
    return this.write(growthProductContextPath(safeScope, id), safeScope, context, parseProduct);
  }

  async updateProductContext(
    scope: GrowthCommercialScope, productId: string, context: ProductContext, expectedVersion: number,
  ): Promise<void> {
    const safeScope = checkedScope(scope);
    const id = identifier(productId);
    assertIdentity(id, identifier(context.id));
    version(expectedVersion);
    return this.write(growthProductContextPath(safeScope, id), safeScope, context, parseProduct, expectedVersion);
  }
}

/**
 * Future composition point: explicitly pass the db exported by src/firebase.ts.
 * Construction makes no network calls. No default instance or runtime wiring exists.
 * SDK contention retries retain the caller's expectedVersion, so a winning competing
 * update makes the retry fail with VERSION_CONFLICT instead of silently overwriting.
 */
export function createGrowthCommercialContextRepository(firestore: Firestore): IGrowthCommercialContextRepository {
  const store: GrowthCommercialFirestorePort = {
    async get(path) {
      const snapshot = await getDocFromServer(doc(firestore, path));
      if (!snapshot.exists()) return null;
      return { path: snapshot.ref.path, data: snapshot.data() };
    },
    async list(path) {
      const snapshot = await getDocsFromServer(query(collection(firestore, path), orderBy(documentId(), 'asc')));
      return snapshot.docs.map(item => ({ path: item.ref.path, data: item.data() }));
    },
    runTransaction(operation) {
      return runTransaction(firestore, transaction => operation({
        async get(path) {
          const snapshot = await transaction.get(doc(firestore, path));
          if (!snapshot.exists()) return null;
          return { path: snapshot.ref.path, data: snapshot.data() };
        },
        set(path, data) {
          transaction.set(doc(firestore, path), data);
        },
      }));
    },
    serverTimestamp,
  };
  return new FirestoreGrowthCommercialContextRepository(store);
}
