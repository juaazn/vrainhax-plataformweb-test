"use client";

import { useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { usePatients } from "@/lib/hooks/use-patients";
import { useModules } from "@/lib/hooks/use-modules";
import { useVariantSchema } from "@/lib/hooks/use-variant-schema";
import { usePatientVariantSettings } from "@/lib/hooks/use-patient-variant-settings";
import { useDevices } from "@/lib/hooks/use-devices";
import { DynamicConfigForm } from "@/components/forms/DynamicConfigForm";
import { sessionsApi, patientVariantSettingsApi, ApiError } from "@/lib/api";
import type { VariantSummaryDTO } from "@/types/api";
import { modulesApi } from "@/lib/api";

type SubmitStatus = "idle" | "submitting" | "saving_defaults";

// ---------------------------------------------------------------------------
// Reducer — all mutable form state in one place so no setState inside effects
// ---------------------------------------------------------------------------

type FormState = {
  selectedPatientId: string;
  selectedModuleId: string;
  selectedVariantId: string;
  selectedDeviceId: string;
  variants: VariantSummaryDTO[];
  variantsLoading: boolean;
  config: Record<string, unknown>;
  submitStatus: SubmitStatus;
  errorMessage: string;
  saveDefaultsMessage: string;
};

type FormAction =
  | { type: "SET_PATIENT"; id: string }
  | { type: "SET_MODULE"; id: string }
  | { type: "SET_VARIANT"; id: string }
  | { type: "SET_DEVICE"; id: string }
  | { type: "VARIANTS_LOADING" }
  | { type: "VARIANTS_LOADED"; variants: VariantSummaryDTO[] }
  | { type: "VARIANTS_ERROR" }
  | { type: "SET_CONFIG"; config: Record<string, unknown> }
  | { type: "APPLY_SAVED_SETTINGS"; config: Record<string, unknown> }
  | { type: "SUBMIT_START"; mode: "submitting" | "saving_defaults" }
  | { type: "SUBMIT_DONE" }
  | { type: "SET_ERROR"; message: string }
  | { type: "SET_SAVE_MESSAGE"; message: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_PATIENT":
      return { ...state, selectedPatientId: action.id };
    case "SET_MODULE":
      // Changing module resets downstream selections and config
      return {
        ...state,
        selectedModuleId: action.id,
        selectedVariantId: "",
        variants: [],
        variantsLoading: false,
        config: {},
        saveDefaultsMessage: "",
      };
    case "SET_VARIANT":
      // Changing variant resets config (replaces the old useEffect)
      return {
        ...state,
        selectedVariantId: action.id,
        config: {},
        saveDefaultsMessage: "",
      };
    case "SET_DEVICE":
      return { ...state, selectedDeviceId: action.id };
    case "VARIANTS_LOADING":
      return { ...state, variantsLoading: true, selectedVariantId: "" };
    case "VARIANTS_LOADED":
      return { ...state, variants: action.variants, variantsLoading: false };
    case "VARIANTS_ERROR":
      return { ...state, variants: [], variantsLoading: false };
    case "SET_CONFIG":
      return { ...state, config: action.config };
    case "APPLY_SAVED_SETTINGS":
      return { ...state, config: action.config };
    case "SUBMIT_START":
      return { ...state, submitStatus: action.mode, errorMessage: "" };
    case "SUBMIT_DONE":
      return { ...state, submitStatus: "idle" };
    case "SET_ERROR":
      return { ...state, submitStatus: "idle", errorMessage: action.message };
    case "SET_SAVE_MESSAGE":
      return { ...state, submitStatus: "idle", saveDefaultsMessage: action.message };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isPatient = user?.role === "patient";

  const { patients, isLoading: patientsLoading } = usePatients();
  const { modules, isLoading: modulesLoading } = useModules({ active: true });
  const { devices, isLoading: devicesLoading } = useDevices();

  const [state, dispatch] = useReducer(formReducer, {
    selectedPatientId: searchParams.get("patientId") ?? "",
    selectedModuleId: "",
    selectedVariantId: "",
    selectedDeviceId: "",
    variants: [],
    variantsLoading: false,
    config: {},
    submitStatus: "idle",
    errorMessage: "",
    saveDefaultsMessage: "",
  });

  const {
    selectedPatientId,
    selectedModuleId,
    selectedVariantId,
    selectedDeviceId,
    variants,
    variantsLoading,
    config,
    submitStatus,
    errorMessage,
    saveDefaultsMessage,
  } = state;

  const { schema, isLoading: schemaLoading } = useVariantSchema(
    selectedVariantId || null,
  );

  const { settings: savedSettings } = usePatientVariantSettings(
    selectedPatientId || null,
    selectedVariantId || null,
  );

  // When saved settings load, apply them to config
  useEffect(() => {
    if (savedSettings) {
      dispatch({ type: "APPLY_SAVED_SETTINGS", config: savedSettings.config });
    }
  }, [savedSettings]);

  // Fetch variants when module changes (empty module handled by SET_MODULE reducer)
  useEffect(() => {
    if (!selectedModuleId) return;

    let cancelled = false;
    dispatch({ type: "VARIANTS_LOADING" });

    modulesApi
      .listVariants(selectedModuleId, { active: true })
      .then((data) => {
        if (!cancelled) dispatch({ type: "VARIANTS_LOADED", variants: data });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "VARIANTS_ERROR" });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedModuleId]);

  // ---------------------------------------------------------------------------
  // Access guard
  // ---------------------------------------------------------------------------

  if (isPatient) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Nueva Sesion</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Acceso denegado</p>
          <p className="mt-1 text-sm text-red-700">
            No tienes permiso para crear sesiones.
          </p>
          <button
            type="button"
            onClick={() => router.push("/sessions")}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Volver a Sesiones
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Async handlers (use dispatch, never setState)
  // ---------------------------------------------------------------------------

  async function handleSaveDefaults() {
    if (!selectedPatientId || !selectedVariantId) return;

    dispatch({ type: "SUBMIT_START", mode: "saving_defaults" });

    try {
      await patientVariantSettingsApi.put(selectedPatientId, selectedVariantId, {
        config,
      });
      dispatch({
        type: "SET_SAVE_MESSAGE",
        message: "Configuracion predeterminada guardada.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `Error al guardar: ${err.message}`
          : "Error al guardar la configuracion.";
      dispatch({ type: "SET_SAVE_MESSAGE", message });
    }
  }

  async function handleActivate() {
    if (!selectedPatientId || !selectedVariantId) return;

    dispatch({ type: "SUBMIT_START", mode: "submitting" });

    try {
      const response = await sessionsApi.activate({
        patientId: selectedPatientId,
        variantId: selectedVariantId,
        deviceId: selectedDeviceId || undefined,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      router.push(`/sessions/${response.session.session_id}`);
    } catch (err) {
      let message = "Error inesperado al activar la sesion.";
      if (err instanceof ApiError) {
        if (err.status === 401) message = "Sesion expirada. Recarga la pagina.";
        else if (err.status === 403) message = "No tienes permiso para crear sesiones.";
        else if (err.status === 409) message = "El dispositivo ya esta en uso en otra sesion.";
        else message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      dispatch({ type: "SET_ERROR", message });
    }
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const isSubmitting = submitStatus === "submitting";
  const isSavingDefaults = submitStatus === "saving_defaults";
  const isBusy = isSubmitting || isSavingDefaults;
  const canActivate = !!selectedPatientId && !!selectedVariantId && !isBusy;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/sessions")}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <h1 className="text-xl font-semibold">Nueva Sesion</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 max-w-2xl">
        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {/* Patient selector */}
        <div>
          <label
            htmlFor="patient-select"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Paciente <span className="text-red-500">*</span>
          </label>
          {patientsLoading ? (
            <p className="text-sm text-slate-400">Cargando pacientes...</p>
          ) : (
            <select
              id="patient-select"
              value={selectedPatientId}
              onChange={(e) => dispatch({ type: "SET_PATIENT", id: e.target.value })}
              disabled={isBusy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Selecciona un paciente...</option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Module selector */}
        <div>
          <label
            htmlFor="module-select"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Modulo <span className="text-red-500">*</span>
          </label>
          {modulesLoading ? (
            <p className="text-sm text-slate-400">Cargando modulos...</p>
          ) : (
            <select
              id="module-select"
              value={selectedModuleId}
              onChange={(e) => dispatch({ type: "SET_MODULE", id: e.target.value })}
              disabled={isBusy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Selecciona un modulo...</option>
              {modules.map((m) => (
                <option key={m.module_id} value={m.module_id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Variant selector */}
        {selectedModuleId && (
          <div>
            <label
              htmlFor="variant-select"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Variante <span className="text-red-500">*</span>
            </label>
            {variantsLoading ? (
              <p className="text-sm text-slate-400">Cargando variantes...</p>
            ) : (
              <select
                id="variant-select"
                value={selectedVariantId}
                onChange={(e) => dispatch({ type: "SET_VARIANT", id: e.target.value })}
                disabled={isBusy}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Selecciona una variante...</option>
                {variants.map((v) => (
                  <option key={v.variant_id} value={v.variant_id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Config form */}
        {selectedVariantId && (
          <div className="border-t border-slate-200 pt-5 space-y-4">
            {schemaLoading ? (
              <p className="text-sm text-slate-400">Cargando configuracion...</p>
            ) : schema ? (
              <>
                <DynamicConfigForm
                  schema={schema.config_schema}
                  initialValues={savedSettings?.config ?? config}
                  onSubmit={(values) =>
                    dispatch({ type: "SET_CONFIG", config: values })
                  }
                  submitLabel="Aplicar configuracion"
                  disabled={isBusy}
                />

                {selectedPatientId && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveDefaults();
                      }}
                      disabled={isBusy}
                      className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isSavingDefaults
                        ? "Guardando..."
                        : "Guardar como predeterminada"}
                    </button>
                    {saveDefaultsMessage && (
                      <p className="text-sm text-slate-600">{saveDefaultsMessage}</p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Device selector */}
        <div>
          <label
            htmlFor="device-select"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Dispositivo{" "}
            <span className="text-slate-400 text-xs">(opcional)</span>
          </label>
          {devicesLoading ? (
            <p className="text-sm text-slate-400">Cargando dispositivos...</p>
          ) : (
            <select
              id="device-select"
              value={selectedDeviceId}
              onChange={(e) => dispatch({ type: "SET_DEVICE", id: e.target.value })}
              disabled={isBusy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Sin dispositivo</option>
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              void handleActivate();
            }}
            disabled={!canActivate}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creando..." : "Crear sesion"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/sessions")}
            disabled={isBusy}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
