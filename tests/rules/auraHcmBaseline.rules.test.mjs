// Run against the Firestore emulator only, bound to 127.0.0.1:18080 with
// project demo-aura-hcm-baseline. Java 21+: -Duser.language=en -Duser.country=US.
// node --test --test-timeout=120000 tests/rules/auraHcmBaseline.rules.test.mjs
// This is representative baseline coverage, not an exhaustive HCM security audit.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { before, after, describe, it } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore';

const source = new URL('../../firestore/rules/aura-hcm.firestore.rules', import.meta.url);
const expectedHash = '85ae17e87fc926101252ee3dba6a2b0a044f1f8dee09b6fa5de3fc93da3f0e26';
const bytes = readFileSync(source);
const hash = data => createHash('sha256').update(data).digest('hex');
assert.equal(hash(bytes), expectedHash, 'Refuse to load a different baseline');
const useCandidate = process.env.AURA_HCM_COMBINED_RULES === '1';
const projectId = useCandidate ? 'demo-aura-hcm-combined' : 'demo-aura-hcm-baseline';
const loadedRules = useCandidate
  ? readFileSync(new URL('../../firestore/rules/aura-hcm.growth.candidate.rules', import.meta.url), 'utf8')
  : bytes.toString('utf8');
setLogLevel('silent');
let environment;
const actor = uid => uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore();
const read = (db, path) => getDoc(doc(db, path));

describe('Canonical HCM baseline on the real local Firestore emulator', { concurrency: false }, () => {
  before(async () => {
    environment = await initializeTestEnvironment({ projectId,
      firestore: { host: '127.0.0.1', port: 18080, rules: loadedRules } });
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      const entries = [
        ['users/reader-a', { companyId: 'company-a', profileId: 'telemetry-reader', role: 'EMPLOYEE', employeeId: 'employee-a' }],
        ['users/reader-b', { companyId: 'company-b', profileId: 'telemetry-reader', role: 'EMPLOYEE', employeeId: 'employee-b' }],
        ['users/employee-a', { companyId: 'company-a', profileId: 'employee', role: 'EMPLOYEE', employeeId: 'employee-a' }],
        ['users/admin', { companyId: 'company-a', profileId: 'super-admin', role: 'SUPER_ADMIN', employeeId: 'admin' }],
        ['permissions_matrix/telemetry-reader', { telemetry: { Ver: true } }],
        ['permissions_matrix/employee', { telemetry: { Ver: false } }],
        ['aura_telemetry_events/event-a', { companyId: 'company-a', event: 'baseline' }],
        ['aura_telemetry_events/event-b', { companyId: 'company-b', event: 'baseline' }],
        ['companies/company-a', { name: 'Company A' }],
        ['companies/company-b', { name: 'Company B' }],
        ['companies/company-a/signatureRecords/record-a', { employeeId: 'employee-a' }],
        ['config/baseline', { companyId: 'company-a', enabled: true }],
        ['baseline_unmatched/document', { companyId: 'company-a' }],
        ['baseline_unmatched/document/nested/document', { companyId: 'company-a' }],
      ];
      for (const [path, data] of entries) await setDoc(doc(db, path), data);
    });
  }, { timeout: 60_000 });
  after(async () => { if (environment) await environment.cleanup(); });

  it('CASE 1: complete local ruleset loads and permits an existing authorized read', async () => {
    const snapshot = await assertSucceeds(read(actor('reader-a'), 'companies/company-a'));
    assert.equal(snapshot.data().name, 'Company A');
  });

  it('CASE 2: representative protected paths retain positive and negative behavior', async () => {
    const a = actor('reader-a');
    await assertSucceeds(read(a, 'aura_telemetry_events/event-a'));
    await assertSucceeds(getDocs(query(collection(a, 'aura_telemetry_events'), where('companyId', '==', 'company-a'))));
    await assertFails(getDocs(collection(a, 'aura_telemetry_events')));
    await assertFails(read(a, 'aura_telemetry_events/event-b'));
    await assertFails(read(actor('reader-b'), 'aura_telemetry_events/event-a'));
    await assertFails(read(actor('employee-a'), 'aura_telemetry_events/event-a'));
    await assertFails(read(actor(null), 'aura_telemetry_events/event-a'));
    await assertFails(read(actor('unprovisioned'), 'aura_telemetry_events/event-a'));
    await assertSucceeds(read(actor('admin'), 'aura_telemetry_events/event-b'));
    await assertFails(read(a, 'companies/company-b'));
    await assertSucceeds(read(a, 'companies/company-a/signatureRecords/record-a'));
    await assertFails(updateDoc(doc(a, 'companies/company-a/signatureRecords/record-a'), { employeeId: 'other' }));
    await assertSucceeds(read(a, 'config/baseline'));
    await assertFails(read(actor('reader-b'), 'config/baseline'));
    await assertFails(updateDoc(doc(actor('admin'), 'config/baseline'), { enabled: false }));
  });

  it('CASE 3: catch-all denies unmatched root and nested reads including administrators', async () => {
    for (const uid of [null, 'reader-a', 'admin']) {
      const db = actor(uid);
      await assertFails(read(db, 'baseline_unmatched/document'));
      await assertFails(read(db, 'baseline_unmatched/document/nested/document'));
      await assertFails(getDocs(collection(db, 'baseline_unmatched')));
    }
  });

  it('CASE 4: no global grant permits unmatched creates, updates or deletes', async () => {
    for (const uid of [null, 'reader-a', 'admin']) {
      const db = actor(uid);
      await assertFails(setDoc(doc(db, 'baseline_unmatched/new-document'), { companyId: 'company-a' }));
      await assertFails(updateDoc(doc(db, 'baseline_unmatched/document'), { changed: true }));
      await assertFails(deleteDoc(doc(db, 'baseline_unmatched/document')));
    }
  });

  it('CASE 5: telemetry creation is scoped while unsupported mutation remains denied', async () => {
    const db = actor('reader-a');
    await assertSucceeds(setDoc(doc(db, 'aura_telemetry_events/new-event'), { companyId: 'company-a', event: 'baseline' }));
    await assertFails(setDoc(doc(db, 'aura_telemetry_events/cross-company'), { companyId: 'company-b' }));
    await assertFails(setDoc(doc(db, 'aura_telemetry_events/no-company'), { event: 'baseline' }));
    for (const uid of ['reader-a', 'admin']) {
      await assertFails(updateDoc(doc(actor(uid), 'aura_telemetry_events/event-a'), { event: 'changed' }));
      await assertFails(deleteDoc(doc(actor(uid), 'aura_telemetry_events/event-a')));
    }
  });

  it('CASE 6: baseline bytes and unchanged canonical file match the certified SHA-256', () => {
    assert.equal(hash(bytes), expectedHash);
    assert.deepEqual(readFileSync(source), bytes);
    const retainedBaseline = useCandidate
      ? loadedRules.replace(/    \/\/ BEGIN LOCAL GROWTH CANDIDATE[^]*?    \/\/ END LOCAL GROWTH CANDIDATE\n\n/, '')
      : loadedRules;
    assert.equal(retainedBaseline, bytes.toString('utf8'), 'Candidate must retain the entire baseline verbatim');
  });
});
