import { useReducer, useCallback } from 'react';
import { usersApi, ApiError } from '@/lib/api';
import type { PlatformUserDTO, UserCreatePayload } from '@/types/api';

interface State {
  isCreating: boolean;
  error: ApiError | null;
}

type Action =
  | { type: 'CREATE_START' }
  | { type: 'CREATE_SUCCESS' }
  | { type: 'CREATE_ERROR'; payload: ApiError }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CREATE_START':
      return { isCreating: true, error: null };
    case 'CREATE_SUCCESS':
      return { isCreating: false, error: null };
    case 'CREATE_ERROR':
      return { isCreating: false, error: action.payload };
    case 'RESET':
      return { isCreating: false, error: null };
    default:
      return state;
  }
}

const initialState: State = { isCreating: false, error: null };

export interface UseCreateUserResult {
  createUser: (payload: UserCreatePayload) => Promise<PlatformUserDTO>;
  isCreating: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useCreateUser(): UseCreateUserResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  const createUser = useCallback(async (payload: UserCreatePayload): Promise<PlatformUserDTO> => {
    dispatch({ type: 'CREATE_START' });
    try {
      const user = await usersApi.create(payload);
      dispatch({ type: 'CREATE_SUCCESS' });
      return user;
    } catch (err: unknown) {
      const apiError =
        err instanceof ApiError
          ? err
          : new ApiError(0, 'UNKNOWN_ERROR', err instanceof Error ? err.message : String(err));
      dispatch({ type: 'CREATE_ERROR', payload: apiError });
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { ...state, createUser, reset };
}
