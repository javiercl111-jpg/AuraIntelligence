// R8 reproduction (PowerShell): start Java 21+ Firestore emulator at 127.0.0.1:18080
// with -Duser.language=en -Duser.country=US and --project_id demo-aura-hcm-combined
// --single_project_mode true --single_project_mode_error true.
// $env:AURA_HCM_COMBINED_RULES='1'
// node --test --test-concurrency=1 --test-timeout=120000 tests/growthCommercialContext.rules.test.mjs tests/rules/auraHcmBaseline.rules.test.mjs tests/rules/auraHcmGrowthCombined.rules.test.mjs
// All three suites use the complete local candidate. No production credentials/config.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore';

const baseline = readFileSync(new URL('../../firestore/rules/aura-hcm.firestore.rules', import.meta.url), 'utf8');
const proposal = readFileSync(new URL('../../firestore.growth.proposed.rules', import.meta.url), 'utf8');
const candidatePath = new URL('../../firestore/rules/aura-hcm.growth.candidate.rules', import.meta.url);
const rules = readFileSync(candidatePath, 'utf8');
assert.equal(createHash('sha256').update(baseline).digest('hex'),
  '85ae17e87fc926101252ee3dba6a2b0a044f1f8dee09b6fa5de3fc93da3f0e26');
const helper = proposal.slice(proposal.indexOf('    function activeGrowthCompany'), proposal.indexOf('    // Preserve own-identity'));
const paths = proposal.slice(proposal.indexOf('    match /growth_commercial_contexts/'), proposal.indexOf('    // tenantId is metadata'));
assert.ok(helper.includes('function activeGrowthCompany(companyId)'));
assert.ok(paths.includes('match /products/{productId}'));
const insertion = '    // BEGIN LOCAL GROWTH CANDIDATE - not configured for deployment\n' + helper + paths + '    // END LOCAL GROWTH CANDIDATE\n\n';
const anchor = '    match /{document=**} {\n      allow read, write: if false;';
assert.equal(baseline.split(anchor).length, 2);
assert.equal(rules, baseline.replace(anchor, insertion + anchor), 'Only the certified Growth helper and paths may be added');
assert.equal(rules.split('match /growth_identities/').length, 2, 'Do not duplicate the identity block');
assert.equal(JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8')).firestore, undefined);
setLogLevel('silent');
let environment;
const enterprise = company => `growth_commercial_contexts/${company}`;
const product = company => `${enterprise(company)}/products/id_product%2Fa`;
const data = companyId => ({ companyId, tenantId: 'tenant-z', version: 1 });
const actor = uid => environment.authenticatedContext(uid).firestore();
async function seed(entries) {
  await environment.withSecurityRulesDisabled(async context => {
    for (const [path, value] of entries) await setDoc(doc(context.firestore(), path), value);
  });
}
async function denyAccess(db, company) {
  for (const path of [enterprise(company), product(company)]) {
    await assertFails(getDoc(doc(db, path)));
    await assertFails(updateDoc(doc(db, path), { version: 2 }));
    await assertFails(deleteDoc(doc(db, path)));
  }
  await assertFails(getDocs(collection(db, `${enterprise(company)}/products`)));
  await assertFails(setDoc(doc(db, `${enterprise(company)}/products/new`), data(company)));
}

describe('Complete HCM and Growth candidate interactions', { concurrency: false }, () => {
  before(async () => {
    environment = await initializeTestEnvironment({ projectId: 'demo-aura-hcm-combined',
      firestore: { host: '127.0.0.1', port: 18080, rules } });
  }, { timeout: 60_000 });
  after(async () => {
    if (environment) await environment.cleanup();
    assert.equal(readFileSync(candidatePath, 'utf8'), rules);
  });
  beforeEach(async () => {
    await environment.clearFirestore();
    await seed([
      ['growth_identities/growth-a', { uid: 'growth-a', companyId: 'company-a', status: 'active' }],
      ['users/hcm-only', { companyId: 'company-a', role: 'EMPLOYEE', profileId: 'employee' }],
      ['users/hcm-admin', { companyId: 'company-a', role: 'SUPER_ADMIN', profileId: 'super-admin' }],
      ['companies/company-a/businessProfiles/main', { companyId: 'company-a' }],
      ['companies/company-b', { name: 'B' }],
      [enterprise('company-a'), data('company-a')], [enterprise('company-b'), data('company-b')],
      [product('company-a'), data('company-a')], [product('company-b'), data('company-b')],
      ['combined_unmatched/document', { companyId: 'company-a' }],
    ]);
  });
  it('CASE 25: active Growth identity accesses its company without an HCM user', async () => {
    const db = actor('growth-a');
    for (const path of [enterprise('company-a'), product('company-a')]) {
      await assertSucceeds(getDoc(doc(db, path)));
      await assertSucceeds(updateDoc(doc(db, path), { version: 2 }));
    }
    await assertSucceeds(getDocs(collection(db, `${enterprise('company-a')}/products`)));
  });
  it('CASE 26: active company-a identity cannot access company-b', async () => {
    await denyAccess(actor('growth-a'), 'company-b');
  });
  it('CASE 27: HCM membership without an active Growth identity grants no Growth access', async () => {
    const db = actor('hcm-only');
    await assertSucceeds(getDoc(doc(db, 'companies/company-a/businessProfiles/main')));
    await denyAccess(db, 'company-a');
    await seed([['growth_identities/hcm-only', { uid: 'hcm-only', companyId: 'company-a', status: 'inactive' }]]);
    await denyAccess(db, 'company-a');
  });
  it('CASE 28: different tenant metadata never changes company authorization', async () => {
    const db = actor('growth-a');
    for (const path of [enterprise('company-a'), product('company-a')]) {
      const snapshot = await assertSucceeds(getDoc(doc(db, path)));
      assert.equal(snapshot.data().tenantId, 'tenant-z');
      await assertSucceeds(updateDoc(doc(db, path), { version: 2 }));
    }
    await denyAccess(db, 'company-b'); // Same tenant metadata does not bridge companies.
  });
  it('CASE 29: correct company with different tenant metadata permits creation', async () => {
    await environment.withSecurityRulesDisabled(async context => {
      for (const path of [enterprise('company-a'), product('company-a')]) await deleteDoc(doc(context.firestore(), path));
    });
    for (const path of [enterprise('company-a'), product('company-a')]) {
      await assertSucceeds(setDoc(doc(actor('growth-a'), path), data('company-a')));
    }
  });
  it('CASE 30: updates cannot change companyId', async () => {
    for (const path of [enterprise('company-a'), product('company-a')]) {
      await assertFails(updateDoc(doc(actor('growth-a'), path), { companyId: 'company-b' }));
    }
  });
  it('CASE 31: authorized Growth users still cannot delete', async () => {
    for (const path of [enterprise('company-a'), product('company-a')]) {
      await assertFails(deleteDoc(doc(actor('growth-a'), path)));
    }
  });
  it('CASE 32: real HCM super-admin and wildcard grants cannot bypass Growth identity', async () => {
    const db = actor('hcm-admin');
    await assertSucceeds(getDoc(doc(db, 'companies/company-b')));
    await assertSucceeds(updateDoc(doc(db, 'companies/company-a/businessProfiles/main'), { checked: true }));
    await denyAccess(db, 'company-a');
    await denyAccess(db, 'company-b');
    await assertFails(setDoc(doc(db, 'growth_identities/hcm-admin'), { uid: 'hcm-admin', companyId: 'company-a', status: 'active' }));
    await seed([['growth_identities/hcm-admin', { uid: 'hcm-admin', companyId: 'company-b', status: 'active' }]]);
    await denyAccess(db, 'company-a');
    await assertSucceeds(getDoc(doc(db, enterprise('company-b'))));
  });
  it('CASE 33: catch-all denies unknown paths despite HCM or Growth privileges', async () => {
    for (const uid of ['growth-a', 'hcm-admin']) {
      const db = actor(uid);
      await assertFails(getDoc(doc(db, 'combined_unmatched/document')));
      await assertFails(updateDoc(doc(db, 'combined_unmatched/document'), { changed: true }));
      await assertFails(deleteDoc(doc(db, 'combined_unmatched/document')));
      await assertFails(setDoc(doc(db, 'combined_unmatched/new'), data('company-a')));
      await assertFails(setDoc(doc(db, `${product('company-a')}/private/new`), data('company-a')));
    }
  });
});
