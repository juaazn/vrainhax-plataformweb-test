import { useCallback, useReducer, useEffect, useState } from "react";
import { patientsApi } from "@/lib/api";
import type { PatientProgressDTO, PatientProgressListParams } from "@/types/api";

interface State {
  progress: PatientProgressDTO | null;
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: PatientProgressDTO }
  | { type: "FETCH_ERROR"; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { progress: state.progress, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { progress: action.payload, isLoading: false, error: null };
    case "FETCH_ERROR":
      return { progress: null, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = { progress: null, isLoading: true, error: null };

interface UsePatientProgressResult {
  progress: PatientProgressDTO | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function usePatientProgress(
  patientId: string | null,
  params?: PatientProgressListParams,
): UsePatientProgressResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const paramsKey = params ? JSON.stringify(params) : "";

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    dispatch({ type: "FETCH_START" });
    patientsApi
      .getProgress(patientId, params)
      .then((data) => {
        if (!cancelled) dispatch({ type: "FETCH_SUCCESS", payload: data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: "FETCH_ERROR",
            payload: err instanceof Error ? err : new Error(String(err)),
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, paramsKey, tick]);

  return { ...state, reload };
}
