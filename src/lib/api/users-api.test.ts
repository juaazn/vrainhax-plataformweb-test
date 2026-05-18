import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersApi } from './users-api';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);
const patchMock = vi.mocked(apiClient.patch);

const fakeUser = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  fullName: 'Test User',
  role: 'administrador',
  roleId: 'role-1',
  active: true,
  auth0Sub: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usersApi', () => {
  describe('list()', () => {
    it('calls GET /api/v1/users without params', async () => {
      getMock.mockResolvedValue([fakeUser]);

      const result = await usersApi.list();

      expect(getMock).toHaveBeenCalledWith('/api/v1/users', undefined);
      expect(result).toEqual([fakeUser]);
    });

    it('passes active param to GET /api/v1/users', async () => {
      getMock.mockResolvedValue([fakeUser]);

      await usersApi.list({ active: true });

      expect(getMock).toHaveBeenCalledWith('/api/v1/users', { active: true });
    });
  });

  describe('getById()', () => {
    it('calls GET /api/v1/users/:id', async () => {
      getMock.mockResolvedValue(fakeUser);

      const result = await usersApi.getById('user-1');

      expect(getMock).toHaveBeenCalledWith('/api/v1/users/user-1');
      expect(result).toEqual(fakeUser);
    });
  });

  describe('create()', () => {
    it('calls POST /api/v1/users with correct payload', async () => {
      postMock.mockResolvedValue(fakeUser);

      const payload = {
        username: 'newuser',
        email: 'new@example.com',
        roleId: 'role-2',
        fullName: 'New User',
      };
      const result = await usersApi.create(payload);

      expect(postMock).toHaveBeenCalledWith('/api/v1/users', payload);
      expect(result).toEqual(fakeUser);
    });
  });

  describe('patch()', () => {
    it('calls PATCH /api/v1/users/:id with patch payload', async () => {
      const patched = { ...fakeUser, fullName: 'Updated Name' };
      patchMock.mockResolvedValue(patched);

      const result = await usersApi.patch('user-1', { fullName: 'Updated Name' });

      expect(patchMock).toHaveBeenCalledWith('/api/v1/users/user-1', { fullName: 'Updated Name' });
      expect(result).toEqual(patched);
    });
  });

  describe('deactivate()', () => {
    it('calls PATCH /api/v1/users/:id/deactivate without body', async () => {
      const deactivated = { ...fakeUser, active: false };
      patchMock.mockResolvedValue(deactivated);

      const result = await usersApi.deactivate('user-1');

      expect(patchMock).toHaveBeenCalledWith('/api/v1/users/user-1/deactivate');
      expect(result).toEqual(deactivated);
    });
  });
});
