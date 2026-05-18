import { useReducer, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import type { PlatformUserDTO, UserListParams } from '@/types/api';

interface State {
  users: PlatformUserDTO[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: PlatformUserDTO[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { users: state.users, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { users: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { users: [], isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = { users: [], isLoading: true, error: null };

export interface UseUsersResult {
  users: PlatformUserDTO[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useUsers(params?: UserListParams): UseUsersResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tick, setTick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    usersApi
      .list(params)
      .then((data) => {
        if (!cancelled) dispatch({ type: 'FETCH_SUCCESS', payload: data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: 'FETCH_ERROR',
            payload: err instanceof Error ? err : new Error(String(err)),
          });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.active, tick]);

  return { ...state, reload: setTick };
}
