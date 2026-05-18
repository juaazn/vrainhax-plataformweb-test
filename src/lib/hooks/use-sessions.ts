import { useCallback, useReducer, useEffect, useState } from 'react';
import { sessionsApi } from '@/lib/api';
import type { SessionDTO, SessionListParams } from '@/types/api';

interface State {
  sessions: SessionDTO[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: SessionDTO[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { sessions: state.sessions, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { sessions: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { sessions: [], isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = { sessions: [], isLoading: true, error: null };

export interface UseSessionsResult {
  sessions: SessionDTO[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useSessions(params?: SessionListParams): UseSessionsResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    sessionsApi
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
  }, [tick, params?.patientId, params?.status, params?.dateFrom, params?.dateTo]);

  return { ...state, reload };
}
