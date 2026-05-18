import { useCallback, useReducer, useEffect, useState } from 'react';
import { sessionsApi } from '@/lib/api';
import type { SessionDetailDTO } from '@/types/api';

interface State {
  session: SessionDetailDTO | null;
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: SessionDetailDTO }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { session: state.session, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { session: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { session: null, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = { session: null, isLoading: true, error: null };

export interface UseSessionResult {
  session: SessionDetailDTO | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useSession(sessionId: string): UseSessionResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    sessionsApi
      .getById(sessionId)
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
  }, [sessionId, tick]);

  return { ...state, reload };
}
