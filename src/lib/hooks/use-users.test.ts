import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsers } from './use-users';
import type { PlatformUserDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  usersApi: {
    list: vi.fn(),
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

import { usersApi, ApiError } from '@/lib/api';

const mockUsers: PlatformUserDTO[] = [
  {
    userId: 'user-1',
    email: 'admin@example.com',
    username: 'admin',
    fullName: 'Admin User',
    role: 'admin',
    roleId: 'role-1',
    active: true,
    auth0Sub: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: null,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useUsers', () => {
  it('returns user list on happy path', async () => {
    vi.mocked(usersApi.list).mockResolvedValue(mockUsers);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
    expect(usersApi.list).toHaveBeenCalledWith(undefined);
  });

  it('returns error on API failure', async () => {
    const apiError = new Error('Network error');
    vi.mocked(usersApi.list).mockRejectedValue(apiError);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBe(apiError);
  });

  it('exposes error 403 correctly', async () => {
    const forbiddenError = new ApiError(403, 'FORBIDDEN', 'Access denied');
    vi.mocked(usersApi.list).mockRejectedValue(forbiddenError);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBe(forbiddenError);
    expect((result.current.error as ApiError).status).toBe(403);
  });
});
