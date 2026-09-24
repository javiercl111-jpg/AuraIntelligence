import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  FirestoreTalentTenantRegistryV1,
  type FirestoreTenantDocumentV1,
  type FirestoreTenantQuerySnapshotV1,
  type FirestoreTenantQueryV1,
  type FirestoreTenantReaderV1,
  type FirestoreTenantReadTransactionV1,
} from "./firestoreTalentTenantRegistryV1.js";
import {
  TALENT_BRIDGE_CONSUMER_ID_V1,
  TALENT_TENANT_REGISTRY_COLLECTION_V1,
} from "./talentBridgeConstantsV1.js";
import {
  resolveTalentBridgeEnvironmentV1,
  resolveTalentTenantAuthorityV1,
  resolveTalentTenantFromSnapshotV1,
  TalentTenantMismatchErrorV1,
  type TalentTenantAuthorityInputV1,
  type TalentTenantMappingCandidateV1,
} from "./talentTenantAuthorityV1.js";

const input: TalentTenantAuthorityInputV1 = {
  environment: "preview",
  authenticatedConsumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
  hcmCompanyId: "hcm-company-1",
};

function mapping(
  overrides: Partial<TalentTenantMappingCandidateV1> = {},
): TalentTenantMappingCandidateV1 {
  return {
    mappingId: "mapping-1",
    environment: input.environment,
    authenticatedConsumerId: input.authenticatedConsumerId,
    hcmCompanyId: input.hcmCompanyId,
    auraTenantId: "aura-tenant-1",
    status: "ACTIVE",
    ...overrides,
  };
}

function assertTenantMismatch(operation: () => unknown): void {
  assert.throws(operation, TalentTenantMismatchErrorV1);
}

test("mapping found resolves the registry-authorized Aura tenant", async () => {
  const registry = {
    readAuthoritySnapshot: async () => ({
      forward: [mapping()],
      reverse: [mapping()],
    }),
  };

  assert.equal(
    await resolveTalentTenantAuthorityV1(input, registry),
    "aura-tenant-1",
  );
});

test("mapping absent fails closed", () => {
  assertTenantMismatch(() => resolveTalentTenantFromSnapshotV1(input, {
    forward: [],
    reverse: [],
  }));
});

test("disabled mapping fails closed", () => {
  assertTenantMismatch(() => resolveTalentTenantFromSnapshotV1(input, {
    forward: [mapping({ status: "DISABLED" })],
    reverse: [mapping({ status: "DISABLED" })],
  }));
});

test("ambiguous forward mapping fails closed", () => {
  assertTenantMismatch(() => resolveTalentTenantFromSnapshotV1(input, {
    forward: [mapping(), mapping({ mappingId: "mapping-2" })],
    reverse: [mapping()],
  }));
});

test("wildcard and default identifiers are rejected", async () => {
  const unusedRegistry = {
    readAuthoritySnapshot: async () => {
      assert.fail("invalid identifiers must fail before registry access");
    },
  };

  for (const hcmCompanyId of ["*", "company-*", "default", "DEFAULT"]) {
    await assert.rejects(
      resolveTalentTenantAuthorityV1({ ...input, hcmCompanyId }, unusedRegistry),
      TalentTenantMismatchErrorV1,
    );
  }
});

test("noninjective reverse mapping fails closed", () => {
  assertTenantMismatch(() => resolveTalentTenantFromSnapshotV1(input, {
    forward: [mapping()],
    reverse: [mapping(), mapping({
      mappingId: "mapping-2",
      hcmCompanyId: "hcm-company-2",
    })],
  }));
});

test("cross-environment mapping fails closed", () => {
  assertTenantMismatch(() => resolveTalentTenantFromSnapshotV1(input, {
    forward: [mapping({ environment: "staging" })],
    reverse: [mapping({ environment: "staging" })],
  }));
});

test("unknown and unassigned project environments fail closed", () => {
  assert.equal(resolveTalentBridgeEnvironmentV1("aura-intel-preview"), "preview");
  assert.equal(resolveTalentBridgeEnvironmentV1("aura-intel-staging"), "staging");
  assertTenantMismatch(() => resolveTalentBridgeEnvironmentV1(undefined));
  assertTenantMismatch(() => resolveTalentBridgeEnvironmentV1("unknown-project"));
  assertTenantMismatch(() => resolveTalentBridgeEnvironmentV1("production"));
});

class FakeQuery implements FirestoreTenantQueryV1 {
  readonly filters: Array<readonly [string, string]> = [];
  limitValue: number | undefined;

  constructor(readonly collectionPath: string) {}

  where(fieldPath: string, operator: "==", value: string): FakeQuery {
    assert.equal(operator, "==");
    this.filters.push([fieldPath, value]);
    return this;
  }

  limit(value: number): FakeQuery {
    this.limitValue = value;
    return this;
  }
}

function fakeDocument(): FirestoreTenantDocumentV1 {
  return {
    id: "mapping-1",
    data: () => ({
      environment: input.environment,
      authenticatedConsumerId: input.authenticatedConsumerId,
      hcmCompanyId: input.hcmCompanyId,
      auraTenantId: "aura-tenant-1",
      status: "ACTIVE",
    }),
  };
}

class FakeReadOnlyFirestore implements FirestoreTenantReaderV1 {
  readonly queries: FakeQuery[] = [];
  readCount = 0;
  writeCount = 0;
  usedReadOnlyTransaction = false;

  collection(path: string): FakeQuery {
    const query = new FakeQuery(path);
    this.queries.push(query);
    return query;
  }

  async runTransaction<Result>(
    operation: (transaction: FirestoreTenantReadTransactionV1) => Promise<Result>,
    options: { readonly readOnly: true },
  ): Promise<Result> {
    this.usedReadOnlyTransaction = options.readOnly;
    const transaction: FirestoreTenantReadTransactionV1 = {
      get: async (): Promise<FirestoreTenantQuerySnapshotV1> => {
        this.readCount += 1;
        return { docs: [fakeDocument()] };
      },
    };
    return operation(transaction);
  }

  set(): void {
    this.writeCount += 1;
  }

  create(): void {
    this.writeCount += 1;
  }

  update(): void {
    this.writeCount += 1;
  }

  delete(): void {
    this.writeCount += 1;
  }
}

test("Firestore adapter uses bounded transaction reads and performs no writes", async () => {
  const firestore = new FakeReadOnlyFirestore();
  const registry = new FirestoreTalentTenantRegistryV1(firestore);
  const snapshot = await registry.readAuthoritySnapshot(input);

  assert.equal(snapshot.forward.length, 1);
  assert.equal(snapshot.reverse.length, 1);
  assert.equal(firestore.usedReadOnlyTransaction, true);
  assert.equal(firestore.readCount, 2);
  assert.equal(firestore.writeCount, 0);
  assert.equal(firestore.queries.length, 2);
  for (const query of firestore.queries) {
    assert.equal(query.collectionPath, TALENT_TENANT_REGISTRY_COLLECTION_V1);
    assert.equal(query.limitValue, 2);
  }
});
