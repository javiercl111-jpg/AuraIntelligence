// ─────────────────────────────────────────────────────────────
// Aura HCM Connector — Identity Resolution & Scope Security Regression
// ─────────────────────────────────────────────────────────────
//
// Regression coverage for GSTACK-AURA-AUTH-REMEDIATION-R3.
//
// Invariant under test: authorization-sensitive values (role,
// permissions, profileId, company scope) must come ONLY from trusted
// persisted employee/profile records. buildAuraHCMConnectorContext no
// longer accepts any client/UI fallback input at all, and every
// protected read must DENY (zero Firestore queries) before running a
// query when a non-management caller has no valid persisted employeeId.

import { describe, it, expect, beforeEach, vi } from 'vitest';

type FakeDoc = { id: string; data: () => Record<string, unknown> };

const employeeDocs: FakeDoc[] = [];
const profileDocs: FakeDoc[] = [];
type Constraint = { __type: string; field?: string; op?: string; value?: unknown; n?: number };
type QueryRef = { __name: string; constraints: Constraint[] };

const getDocsMock = vi.fn(async (ref: QueryRef) => {
  const source =
    ref.__name === 'employees'
      ? employeeDocs
      : ref.__name === 'profiles'
        ? profileDocs
        : [];
  return { docs: source };
});

vi.mock('../../firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __name: name }),
  where: (field: string, op: string, value: unknown) => ({
    __type: 'where',
    field,
    op,
    value,
  }),
  limit: (n: number) => ({ __type: 'limit', n }),
  query: (ref: { __name: string }, ...constraints: Constraint[]) => ({ ...ref, constraints }),
  getDocs: (ref: QueryRef) => getDocsMock(ref),
}));

import {
  buildAuraHCMConnectorContext,
  getPendingVacationRequests,
  getPendingPermissionRequests,
  getActiveIncapacities,
  getExpiringDocuments,
  getPendingAlerts,
} from '../auraHCMConnectorService';

const makeDoc = (id: string, data: Record<string, unknown>): FakeDoc => ({
  id,
  data: () => data,
});

beforeEach(() => {
  employeeDocs.length = 0;
  profileDocs.length = 0;
  getDocsMock.mockClear();
});

describe('buildAuraHCMConnectorContext — identity resolution comes only from persisted records', () => {
  it('rejects a client fallbackProfileId: profile lookup accepts no caller-supplied input at all', async () => {
    // A "super-admin" profile document exists, but no employee matches
    // this caller. The function signature itself accepts no fallback
    // input, so there is no field through which a client could ever
    // select this profile.
    profileDocs.push(makeDoc('super-admin', { role: 'SUPER_ADMIN' }));

    const ctx = await buildAuraHCMConnectorContext({ userEmail: 'unmatched@aura.demo' });

    expect(ctx.profile).toBeNull();
    expect(ctx.identityResolved).toBe(false);
    expect(ctx.permissions.role).toBeUndefined();
    expect(ctx.permissions.permissions).toEqual([]);
  });

  it('unresolved demo account receives no role, no permissions, no company scope', async () => {
    const ctx = await buildAuraHCMConnectorContext({ userEmail: 'admin@aura.demo' });

    expect(ctx.identityResolved).toBe(false);
    expect(ctx.employee).toBeNull();
    expect(ctx.permissions.role).toBeUndefined();
    expect(ctx.permissions.permissions).toEqual([]);
    expect(ctx.permissions.canApproveVacations).toBe(false);
    expect(ctx.permissions.canManagePayroll).toBe(false);
    expect(ctx.company).toBeNull();
  });

  it('a persisted employee with no role field stays roleless (no fallback inheritance)', async () => {
    employeeDocs.push(makeDoc('emp-0', { email: 'roleless@aura.demo', companyId: 'company-1' }));

    const ctx = await buildAuraHCMConnectorContext({ userEmail: 'roleless@aura.demo' });

    expect(ctx.identityResolved).toBe(true);
    expect(ctx.permissions.role).toBeUndefined();
  });

  it('a persisted EMPLOYEE never gains payroll/admin capabilities', async () => {
    employeeDocs.push(
      makeDoc('emp-1', { email: 'employee@aura.demo', companyId: 'company-1', role: 'EMPLOYEE' })
    );

    const ctx = await buildAuraHCMConnectorContext({ userEmail: 'employee@aura.demo' });

    expect(ctx.identityResolved).toBe(true);
    expect(ctx.permissions.role).toBe('EMPLOYEE');
    expect(ctx.permissions.permissions).toEqual([]);
    expect(ctx.permissions.canManagePayroll).toBe(false);
    expect(ctx.permissions.canManageEmployees).toBe(false);
  });

  it('a persisted management employee retains their real role and company binding', async () => {
    employeeDocs.push(
      makeDoc('emp-2', { email: 'hr@aura.demo', companyId: 'company-1', role: 'HR_MANAGER' })
    );

    const ctx = await buildAuraHCMConnectorContext({ userEmail: 'hr@aura.demo' });

    expect(ctx.identityResolved).toBe(true);
    expect(ctx.permissions.role).toBe('HR_MANAGER');
    expect(ctx.permissions.canApproveVacations).toBe(true);
    expect(ctx.employee?.companyId).toBe('company-1');
  });
});

const companyId = ' company-persisted ';
const alertPaths = [
  'attendance_alerts',
  'document_expiry_alerts_log',
  'vacation_requests',
  'permission_requests',
  'incapacity_requests',
  `companies/${companyId}/signatureDocuments`,
];
const readers = [
  { name: 'vacations', read: getPendingVacationRequests, paths: ['vacation_requests'], management: true },
  { name: 'permissions', read: getPendingPermissionRequests, paths: ['permission_requests'], management: true },
  { name: 'incapacities', read: getActiveIncapacities, paths: ['incapacity_requests'], management: true },
  { name: 'documents', read: getExpiringDocuments, paths: ['document_expiry_alerts_log'], management: false },
  { name: 'alerts', read: getPendingAlerts, paths: alertPaths, management: true },
];

const equality = (field: string, value: string): Constraint => ({
  __type: 'where', field, op: '==', value,
});
const assertQueries = (paths: string[], employeeId?: string) => {
  expect(getDocsMock).toHaveBeenCalledTimes(paths.length);
  const queries = getDocsMock.mock.calls.map(([ref]) => ref);
  expect(queries.map((ref) => ref.__name).sort()).toEqual([...paths].sort());
  for (const path of paths) {
    const matching = queries.filter((ref) => ref.__name === path);
    expect(matching).toHaveLength(1);
    const { constraints } = matching[0];
    expect(constraints.filter((c) => c.field === 'employeeId')).toEqual(
      employeeId === undefined ? [] : [equality('employeeId', employeeId)]
    );
    expect(constraints.filter((c) => c.field === 'companyId')).toEqual(
      path === `companies/${companyId}/signatureDocuments`
        ? [] : [equality('companyId', companyId)]
    );
  }
};

for (const { name, read, paths, management } of readers) {
  describe(`${name} exact authorization scope`, () => {
    for (const role of ['EMPLOYEE', undefined]) {
      it.each([undefined, '', ' \t\n '])(`denies invalid employee IDs with role ${role}`, async (employeeId) => {
        expect(await read(companyId, employeeId, role)).toEqual([]);
        expect(getDocsMock).not.toHaveBeenCalled();
      });
    }

    it.each(['emp-self', ' emp-self '])('preserves exact persisted employee ID %j and company boundary', async (employeeId) => {
      await read(companyId, employeeId, 'EMPLOYEE');
      assertQueries(paths, employeeId);
    });

    if (management) {
      it.each(['SUPER_ADMIN', 'ADMIN', 'RH', 'HR', 'HR_MANAGER', 'HR_ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL'])(
        'preserves company-wide LIST scope for %s without an employee filter', async (role) => {
          await read(companyId, undefined, role);
          assertQueries(paths);
        }
      );
    }
  });
}
