import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateUser } from './use-create-user';
import type { PlatformUserDTO, UserCreatePayload } from '@/types/api';

vi.mock('@/lib/api', () => ({
  usersApi: {
    create: vi.fn(),
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

const fakeUser: PlatformUserDTO = {
  userId: 'user-new',
  email: 'new@example.com',
  username: 'newuser',
  fullName: null,
  role: 'therapist',
  roleId: 'role-2',
  active: true,
  auth0Sub: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLoginAt: null,
};

const payload: UserCreatePayload = {
  username: 'newuser',
  email: 'new@example.com',
  roleId: 'role-2',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useCreateUser', () => {
  it('createUser calls usersApi.create() and returns the user', async () => {
    vi.mocked(usersApi.create).mockResolvedValue(fakeUser);

    const { result } = renderHook(() => useCreateUser());

    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeNull();

    let returned: PlatformUserDTO | undefined;
    await act(async () => {
      returned = await result.current.createUser(payload);
    });

    expect(usersApi.create).toHaveBeenCalledWith(payload);
    expect(returned).toEqual(fakeUser);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error and isCreating returns to false on API error', async () => {
    const apiError = new ApiError(409, 'CONFLICT', 'Email already exists');
    vi.mocked(usersApi.create).mockRejectedValue(apiError);

    const { result } = renderHook(() => useCreateUser());

    await act(async () => {
      try {
        await result.current.createUser(payload);
      } catch {
        // expected to throw
      }
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBe(apiError);
    expect(result.current.error?.status).toBe(409);
  });

  it('reset clears error state', async () => {
    const apiError = new ApiError(400, 'VALIDATION_ERROR', 'Invalid email');
    vi.mocked(usersApi.create).mockRejectedValue(apiError);

    const { result } = renderHook(() => useCreateUser());

    await act(async () => {
      try {
        await result.current.createUser(payload);
      } catch {
        // expected
      }
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isCreating).toBe(false);
  });
});
