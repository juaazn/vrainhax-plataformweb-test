import { useReducer, useEffect } from 'react';
import { variantsApi } from '@/lib/api';
import type { VariantSchemaDTO } from '@/types/api';

interface State {
  schema: VariantSchemaDTO | null;
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: VariantSchemaDTO }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { schema: state.schema, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { schema: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { schema: null, isLoading: false, error: action.payload };
    case 'RESET':
      return { schema: null, isLoading: false, error: null };
    default:
      return state;
  }
}

const initialState: State = { schema: null, isLoading: false, error: null };

export interface UseVariantSchemaResult {
  schema: VariantSchemaDTO | null;
  isLoading: boolean;
  error: Error | null;
}

export function useVariantSchema(variantId: string | null): UseVariantSchemaResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (variantId === null) {
      dispatch({ type: 'RESET' });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    variantsApi
      .getSchema(variantId)
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
  }, [variantId]);

  return state;
}
