import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const {
  getDocMock,
  docMock,
} = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  docMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  getDoc: getDocMock,
}));

vi.mock('../../../firebase', () => ({
  db: { name: 'test-db' },
}));

import {
  clearGrowthIdentityCache,
  getGrowthIdentity,
} from '../services/growthIdentityRepository';

describe('growthIdentityRepository', () => {
  beforeEach(() => {
    clearGrowthIdentityCache();
    getDocMock.mockReset();
    docMock.mockReset();

    docMock.mockReturnValue({
      path: 'growth_identities/user-1',
    });
  });

  it('loads identity by direct uid document and caches the session read', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'user-1',
        companyId: 'company-1',
        status: 'active',
      }),
    });

    const first =
      await getGrowthIdentity('user-1');

    const second =
      await getGrowthIdentity('user-1');

    expect(first).toEqual({
      uid: 'user-1',
      companyId: 'company-1',
      status: 'active',
      email: undefined,
      displayName: undefined,
    });

    expect(second).toEqual(first);

    expect(docMock).toHaveBeenCalledTimes(1);
    expect(getDocMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the identity document does not exist', async () => {
    getDocMock.mockResolvedValue({
      exists: () => false,
    });

    await expect(
      getGrowthIdentity('user-1'),
    ).resolves.toBeNull();

    expect(getDocMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed for invalid company identity data', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'user-1',
        companyId: '',
        status: 'active',
      }),
    });

    await expect(
      getGrowthIdentity('user-1'),
    ).resolves.toBeNull();
  });

  it('does not read Firestore for an empty uid', async () => {
    await expect(
      getGrowthIdentity(''),
    ).resolves.toBeNull();

    expect(getDocMock).not.toHaveBeenCalled();
  });
});