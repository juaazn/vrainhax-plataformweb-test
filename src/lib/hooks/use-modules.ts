import { useReducer, useEffect } from 'react';
import { modulesApi } from '@/lib/api';
import type { ModuleDTO, ModuleListParams } from '@/types/api';

interface State {
  modules: ModuleDTO[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ModuleDTO[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { modules: state.modules, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { modules: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { modules: [], isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = { modules: [], isLoading: true, error: null };

export interface UseModulesResult {
  modules: ModuleDTO[];
  isLoading: boolean;
  error: Error | null;
}

export function useModules(params?: ModuleListParams): UseModulesResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    modulesApi
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
  }, [params?.active]);

  return state;
}
