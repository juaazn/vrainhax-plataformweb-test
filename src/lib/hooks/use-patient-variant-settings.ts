import { useReducer, useEffect } from 'react';
import { patientVariantSettingsApi } from '@/lib/api';
import type { PatientVariantSettingsDTO } from '@/types/api';

interface State {
  settings: PatientVariantSettingsDTO | null;
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: PatientVariantSettingsDTO }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { settings: state.settings, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { settings: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { settings: null, isLoading: false, error: action.payload };
    case 'RESET':
      return { settings: null, isLoading: false, error: null };
    default:
      return state;
  }
}

const initialState: State = { settings: null, isLoading: false, error: null };

export interface UsePatientVariantSettingsResult {
  settings: PatientVariantSettingsDTO | null;
  isLoading: boolean;
  error: Error | null;
}

export function usePatientVariantSettings(
  patientId: string | null,
  variantId: string | null,
): UsePatientVariantSettingsResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (patientId === null || variantId === null) {
      dispatch({ type: 'RESET' });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    patientVariantSettingsApi
      .get(patientId, variantId)
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
  }, [patientId, variantId]);

  return state;
}
