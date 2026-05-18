import { useCallback, useReducer, useEffect, useState } from 'react';
import { patientsApi } from '@/lib/api';
import type { PatientDTO } from '@/types/api';

interface State {
  patients: PatientDTO[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: PatientDTO[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { patients: state.patients, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { patients: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { patients: [], isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = { patients: [], isLoading: true, error: null };

export interface UsePatientsResult {
  patients: PatientDTO[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function usePatients(): UsePatientsResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    patientsApi
      .list({ active: true })
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
  }, [tick]);

  return { ...state, reload };
}
