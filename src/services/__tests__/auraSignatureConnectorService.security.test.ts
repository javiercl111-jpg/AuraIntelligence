// GSTACK-AURA-AUTH-REMEDIATION-R3: exact persisted scope on every list read.
import { describe, it, expect, beforeEach, vi } from 'vitest';

type Constraint = { __type: string; field?: string; op?: string; value?: unknown; n?: number };
type QueryRef = { __name: string; constraints: Constraint[] };
const getDocsMock = vi.fn(async (_ref: QueryRef) => ({ docs: [] }));

vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __name: name }),
  where: (field: string, op: string, value: unknown) => ({ __type: 'where', field, op, value }),
  limit: (n: number) => ({ __type: 'limit', n }),
  query: (ref: { __name: string }, ...constraints: Constraint[]) => ({ ...ref, constraints }),
  getDocs: (ref: QueryRef) => getDocsMock(ref),
}));

import { getPendingSignaturesList, getExpiredSignaturesList } from '../auraSignatureConnectorService';

beforeEach(() => { getDocsMock.mockClear(); });
const companyId = ' company-persisted ';
const assertQuery = (employeeId?: string) => {
  expect(getDocsMock).toHaveBeenCalledTimes(1);
  const [ref] = getDocsMock.mock.calls[0];
  expect(ref.__name).toBe(`companies/${companyId}/signatureDocuments`);
  expect(ref.constraints.filter((c) => c.field === 'employeeId')).toEqual(
    employeeId === undefined ? [] : [{ __type: 'where', field: 'employeeId', op: '==', value: employeeId }]
  );
};

for (const [name, read] of [
  ['pending', getPendingSignaturesList],
  ['expired', getExpiredSignaturesList],
] as const) {
  describe(`${name} signature list scope`, () => {
    for (const role of ['EMPLOYEE', undefined]) {
      it.each([undefined, '', ' \t\n '])(`denies invalid employee IDs with role ${role}`, async (employeeId) => {
        expect(await read(companyId, employeeId, role)).toEqual([]);
        expect(getDocsMock).not.toHaveBeenCalled();
      });
    }

    it.each(['emp-self', ' emp-self '])('preserves exact persisted employee ID %j and company path', async (employeeId) => {
      await read(companyId, employeeId, 'EMPLOYEE');
      assertQuery(employeeId);
    });

    it.each(['SUPER_ADMIN', 'ADMIN', 'RH', 'HR', 'HR_MANAGER', 'HR_ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL'])(
      'preserves management LIST scope for %s', async (role) => {
        await read(companyId, undefined, role);
        assertQuery();
      }
    );
  });
}
