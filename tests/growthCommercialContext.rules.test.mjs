// Start the emulator with Java 21+ (English avoids missing localized error bundles):
// java -Duser.language=en -Duser.country=US -jar <emulator.jar> --host 127.0.0.1
//   --port 18080 --project_id demo-growth-rules-r1 --single_project_mode true
//   --single_project_mode_error true
// Then: node --test --test-timeout=120000 tests/growthCommercialContext.rules.test.mjs
// No application Firebase configuration, credentials, or production project is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';

// Expected permission denials are asserted below; avoid flooding the test report.
setLogLevel('silent');

const projectId = 'demo-growth-rules-r1';
const rules = readFileSync(new URL('../firestore.growth.proposed.rules', import.meta.url), 'utf8');
const firebaseConfig = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
assert.equal(firebaseConfig.firestore, undefined, 'The proposal must not be activated by deploy configuration');

// Compatibility fixture: the company-user helper and generic HCM company-child
// grant inspected in R4. This is NOT a copy/certification of all production rules.
// Only this fixture uses users/{uid}; the proposed Growth policy never does.
const hcmFixture = [
  '    function isCompanyUser(companyId) {',
  '      return request.auth != null',
  '        && exists(/databases/$(database)/documents/users/$(request.auth.uid))',
  '        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;',
  '    }',
  '    match /companies/{companyId}/{subcollection}/{docId} {',
  '      allow read, create, update: if isCompanyUser(companyId)',
  "        && !(subcollection in ['signatureConsents', 'signatureRecords', 'custody', 'custodyChain', 'signatureDocuments', 'auraSignatureEnvelopes']);",
  '      allow delete: if false;',
  '    }',
].join('\n');
const databaseMatch = 'match /databases/{database}/documents {';
assert.equal(rules.split(databaseMatch).length, 2, 'Expected a single database match');
const combinedRules = rules.replace(databaseMatch, databaseMatch + '\n' + hcmFixture);
const enterprisePath = company => 'growth_commercial_contexts/' + company;
const productPath = company => enterprisePath(company) + '/products/id_product%2Fa';
const context = companyId => ({ id: 'enterprise-domain-id', companyId, tenantId: 'tenant-z', version: 1 });
const product = companyId => ({ ...context(companyId), id: 'product/a' });
let environment;

const actor = uid => environment.authenticatedContext(uid).firestore();
const anonymous = () => environment.unauthenticatedContext().firestore();
async function seed(entries) {
  await environment.withSecurityRulesDisabled(async admin => {
    for (const [path, data] of entries) await setDoc(doc(admin.firestore(), path), data);
  });
}
async function denyReads(db, company = 'company-a') {
  await assertFails(getDoc(doc(db, enterprisePath(company))));
  await assertFails(getDoc(doc(db, productPath(company))));
  await assertFails(getDocs(collection(db, enterprisePath(company) + '/products')));
}
async function denyWrites(db) {
  await assertFails(updateDoc(doc(db, enterprisePath('company-a')), { version: 2 }));
  await assertFails(updateDoc(doc(db, productPath('company-a')), { version: 2 }));
  await environment.withSecurityRulesDisabled(async admin => {
    await deleteDoc(doc(admin.firestore(), enterprisePath('company-a')));
    await deleteDoc(doc(admin.firestore(), productPath('company-a')));
  });
  await assertFails(setDoc(doc(db, enterprisePath('company-a')), context('company-a')));
  await assertFails(setDoc(doc(db, productPath('company-a')), product('company-a')));
}

describe('Growth company-scoped rules on a real local Firestore emulator', { concurrency: false }, () => {
  before(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      firestore: { host: '127.0.0.1', port: 18080, rules: combinedRules },
    });
  }, { timeout: 60_000 });

  after(async () => {
    if (environment) await environment.cleanup();
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await seed([
      ['growth_identities/active-a', { uid: 'active-a', companyId: 'company-a', status: 'active' }],
      ['growth_identities/inactive-a', { uid: 'inactive-a', companyId: 'company-a', status: 'inactive' }],
      ['growth_identities/suspended-a', { uid: 'suspended-a', companyId: 'company-a', status: 'suspended' }],
      ['growth_identities/mismatched-a', { uid: 'different-uid', companyId: 'company-a', status: 'active' }],
      [enterprisePath('company-a'), context('company-a')],
      [enterprisePath('company-b'), context('company-b')],
      [productPath('company-a'), product('company-a')],
      [productPath('company-b'), product('company-b')],
    ]);
  }, { timeout: 30_000 });

  it('CASE 1: active identity reads its enterprise', async () => {
    const snapshot = await assertSucceeds(getDoc(doc(actor('active-a'), enterprisePath('company-a'))));
    assert.equal(snapshot.data().companyId, 'company-a');
  });
  it('CASE 2: cross-company reads are denied', async () => {
    await denyReads(actor('active-a'), 'company-b');
  });
  it('CASE 3: inactive identity is denied', async () => {
    await denyReads(actor('inactive-a'));
    await denyWrites(actor('inactive-a'));
  });
  it('CASE 4: suspended identity is denied', async () => {
    await denyReads(actor('suspended-a'));
    await denyWrites(actor('suspended-a'));
  });
  it('CASE 5: unauthenticated access is denied', async () => {
    await denyReads(anonymous());
    await denyWrites(anonymous());
  });
  it('CASE 6: missing identity is denied', async () => {
    await denyReads(actor('missing-a'));
    await denyWrites(actor('missing-a'));
  });
  it('CASE 7: mismatched identity UID is denied', async () => {
    await denyReads(actor('mismatched-a'));
    await denyWrites(actor('mismatched-a'));
  });
  it('CASE 8: own-company enterprise create succeeds', async () => {
    await environment.withSecurityRulesDisabled(admin => deleteDoc(doc(admin.firestore(), enterprisePath('company-a'))));
    await assertSucceeds(setDoc(doc(actor('active-a'), enterprisePath('company-a')), context('company-a')));
  });
  it('CASE 9: enterprise create with foreign or missing companyId is denied', async () => {
    await environment.withSecurityRulesDisabled(admin => deleteDoc(doc(admin.firestore(), enterprisePath('company-a'))));
    const ref = doc(actor('active-a'), enterprisePath('company-a'));
    await assertFails(setDoc(ref, context('company-b')));
    await assertFails(setDoc(ref, { id: 'missing-company' }));
  });
  it('CASE 10: create on a foreign company path is denied', async () => {
    await environment.withSecurityRulesDisabled(async admin => {
      await deleteDoc(doc(admin.firestore(), enterprisePath('company-b')));
      await deleteDoc(doc(admin.firestore(), productPath('company-b')));
    });
    const db = actor('active-a');
    await assertFails(setDoc(doc(db, enterprisePath('company-b')), context('company-b')));
    await assertFails(setDoc(doc(db, productPath('company-b')), product('company-b')));
  });
  it('CASE 11: valid enterprise update succeeds', async () => {
    await assertSucceeds(updateDoc(doc(actor('active-a'), enterprisePath('company-a')), { version: 2 }));
  });
  it('CASE 12: enterprise company mutation and update of corrupt stored company are denied', async () => {
    const ref = doc(actor('active-a'), enterprisePath('company-a'));
    await assertFails(updateDoc(ref, { companyId: 'company-b' }));
    await assertFails(setDoc(ref, { id: 'missing-company' }));
    await seed([[enterprisePath('company-a'), context('company-b')]]);
    await assertFails(setDoc(ref, context('company-a')));
  });
  it('CASE 13: enterprise delete is denied', async () => {
    await assertFails(deleteDoc(doc(actor('active-a'), enterprisePath('company-a'))));
  });
  it('CASE 14: own-company product read and catalog list succeed', async () => {
    const db = actor('active-a');
    const snapshot = await assertSucceeds(getDoc(doc(db, productPath('company-a'))));
    assert.equal(snapshot.data().id, 'product/a');
    assert.notEqual(snapshot.id, snapshot.data().id, 'Encoded segments are not domain IDs');
    const catalog = await assertSucceeds(getDocs(collection(db, enterprisePath('company-a') + '/products')));
    assert.equal(catalog.size, 1);
  });
  it('CASE 15: foreign product read and catalog list are denied', async () => {
    const db = actor('active-a');
    await assertFails(getDoc(doc(db, productPath('company-b'))));
    await assertFails(getDocs(collection(db, enterprisePath('company-b') + '/products')));
  });
  it('CASE 16: own-company product create succeeds', async () => {
    await environment.withSecurityRulesDisabled(admin => deleteDoc(doc(admin.firestore(), productPath('company-a'))));
    await assertSucceeds(setDoc(doc(actor('active-a'), productPath('company-a')), product('company-a')));
  });
  it('CASE 17: product create with wrong or missing companyId is denied', async () => {
    await environment.withSecurityRulesDisabled(admin => deleteDoc(doc(admin.firestore(), productPath('company-a'))));
    const ref = doc(actor('active-a'), productPath('company-a'));
    await assertFails(setDoc(ref, product('company-b')));
    await assertFails(setDoc(ref, { id: 'product/a' }));
  });
  it('CASE 18: valid product update succeeds', async () => {
    await assertSucceeds(updateDoc(doc(actor('active-a'), productPath('company-a')), { version: 2 }));
  });
  it('CASE 19: product company mutation and update of corrupt stored company are denied', async () => {
    const ref = doc(actor('active-a'), productPath('company-a'));
    await assertFails(updateDoc(ref, { companyId: 'company-b' }));
    await assertFails(setDoc(ref, { id: 'product/a' }));
    await seed([[productPath('company-a'), product('company-b')]]);
    await assertFails(setDoc(ref, product('company-a')));
  });
  it('CASE 20: product delete is denied', async () => {
    await assertFails(deleteDoc(doc(actor('active-a'), productPath('company-a'))));
  });
  it('CASE 21: tenant-z metadata permits company-a create/read/update without a tenant identity', async () => {
    await environment.withSecurityRulesDisabled(async admin => {
      await deleteDoc(doc(admin.firestore(), enterprisePath('company-a')));
      await deleteDoc(doc(admin.firestore(), productPath('company-a')));
    });
    const db = actor('active-a');
    for (const [path, data] of [[enterprisePath('company-a'), context('company-a')], [productPath('company-a'), product('company-a')]]) {
      const ref = doc(db, path);
      await assertSucceeds(setDoc(ref, data));
      await assertSucceeds(updateDoc(ref, { version: 2 }));
      const snapshot = await assertSucceeds(getDoc(ref));
      assert.equal(snapshot.data().companyId, 'company-a');
      assert.equal(snapshot.data().tenantId, 'tenant-z');
    }
  });
  it('CASE 22: clients cannot create, update or delete Growth identities or self-assign company', async () => {
    const db = actor('active-a');
    await assertSucceeds(getDoc(doc(db, 'growth_identities/active-a')));
    await assertFails(updateDoc(doc(db, 'growth_identities/active-a'), { companyId: 'company-b' }));
    await assertFails(setDoc(doc(db, 'growth_identities/active-a'), { uid: 'active-a', companyId: 'company-b', status: 'active' }));
    await assertFails(deleteDoc(doc(db, 'growth_identities/active-a')));
    await assertFails(setDoc(doc(actor('missing-a'), 'growth_identities/missing-a'), { uid: 'missing-a', companyId: 'company-a', status: 'active' }));
    await denyReads(db, 'company-b');
  });
  it('CASE 23: HCM company access never grants Growth access', async () => {
    await seed([
      ['users/hcm-only', { companyId: 'company-a', role: 'SUPER_ADMIN', capabilities: ['*'], tenantId: 'company-a' }],
      ['companies/company-a/businessProfiles/main', { companyId: 'company-a' }],
    ]);
    const db = actor('hcm-only');
    await assertSucceeds(getDoc(doc(db, 'companies/company-a/businessProfiles/main')));
    await denyReads(db);
    await denyWrites(db);
    await seed([['growth_identities/hcm-only', { uid: 'hcm-only', companyId: 'company-b', status: 'active' }]]);
    await denyReads(db);
    await assertSucceeds(getDoc(doc(db, enterprisePath('company-b'))));
  });
  it('CASE 24: catch-all denies unmatched Growth paths, nested products and unrelated collections', async () => {
    const db = actor('active-a');
    for (const path of [
      enterprisePath('company-a') + '/private/secret',
      productPath('company-a') + '/private/secret',
      'growth_commercial_contexts/id_tenant-z/companies/id_company-a',
      'growth_unmatched/example',
      'unrelated_collection/example',
    ]) {
      await seed([[path, context('company-a')]]);
      const ref = doc(db, path);
      await assertFails(getDoc(ref));
      await assertFails(updateDoc(ref, { version: 2 }));
      await assertFails(deleteDoc(ref));
      await environment.withSecurityRulesDisabled(admin => deleteDoc(doc(admin.firestore(), path)));
      await assertFails(setDoc(ref, context('company-a')));
    }
  });
});
