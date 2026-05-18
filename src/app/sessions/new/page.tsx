"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function NewSessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPatient = user?.role === "patient";

  const { patients, isLoading: patientsLoading } = usePatients();
  const { modules, isLoading: modulesLoading } = useModules({ active: true });
  const { devices, isLoading: devicesLoading } = useDevices();

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const [variants, setVariants] = useState<VariantSummaryDTO[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [saveDefaultsMessage, setSaveDefaultsMessage] = useState<string>("");

  const { schema, isLoading: schemaLoading } = useVariantSchema(
    selectedVariantId || null,
  );

  const { settings: savedSettings } = usePatientVariantSettings(
    selectedPatientId || null,
    selectedVariantId || null,
  );

  // When saved settings load, update config
  useEffect(() => {
    if (savedSettings) {
      setConfig(savedSettings.config);
    }
  }, [savedSettings]);

  // When variant changes, reset config
  useEffect(() => {
    setConfig({});
    setSaveDefaultsMessage("");
  }, [selectedVariantId]);

  // Fetch variants when module changes
  useEffect(() => {
    if (!selectedModuleId) {
      setVariants([]);
      setSelectedVariantId("");
      return;
    }

    let cancelled = false;
    setVariantsLoading(true);
    setSelectedVariantId("");

    modulesApi
      .listVariants(selectedModuleId, { active: true })
      .then((data) => {
        if (!cancelled) {
          setVariants(data);
          setVariantsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVariants([]);
          setVariantsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedModuleId]);

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

  async function handleSaveDefaults() {
    if (!selectedPatientId || !selectedVariantId) return;

    setSubmitStatus("saving_defaults");
    setSaveDefaultsMessage("");

    try {
      await patientVariantSettingsApi.put(selectedPatientId, selectedVariantId, {
        config,
      });
      setSaveDefaultsMessage("Configuracion predeterminada guardada.");
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveDefaultsMessage(`Error al guardar: ${err.message}`);
      } else {
        setSaveDefaultsMessage("Error al guardar la configuracion.");
      }
    } finally {
      setSubmitStatus("idle");
    }
  }

  async function handleActivate() {
    if (!selectedPatientId || !selectedVariantId) return;

    setSubmitStatus("submitting");
    setErrorMessage("");

    try {
      const response = await sessionsApi.activate({
        patientId: selectedPatientId,
        variantId: selectedVariantId,
        deviceId: selectedDeviceId || undefined,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      router.push(`/sessions/${response.session.session_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage("Sesion expirada. Recarga la pagina.");
        } else if (err.status === 403) {
          setErrorMessage("No tienes permiso para crear sesiones.");
        } else if (err.status === 409) {
          setErrorMessage("El dispositivo ya esta en uso en otra sesion.");
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error inesperado al activar la sesion.");
      }
      setSubmitStatus("idle");
    }
  }

  const isSubmitting = submitStatus === "submitting";
  const isSavingDefaults = submitStatus === "saving_defaults";
  const isBusy = isSubmitting || isSavingDefaults;
  const canActivate = !!selectedPatientId && !!selectedVariantId && !isBusy;

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
              onChange={(e) => setSelectedPatientId(e.target.value)}
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
              onChange={(e) => setSelectedModuleId(e.target.value)}
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
                onChange={(e) => setSelectedVariantId(e.target.value)}
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
                  onSubmit={(values) => setConfig(values)}
                  submitLabel="Aplicar configuracion"
                  disabled={isBusy}
                />

                {selectedPatientId && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { void handleSaveDefaults(); }}
                      disabled={isBusy}
                      className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isSavingDefaults
                        ? "Guardando..."
                        : "Guardar como predeterminada"}
                    </button>
                    {saveDefaultsMessage && (
                      <p className="text-sm text-slate-600">
                        {saveDefaultsMessage}
                      </p>
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
              onChange={(e) => setSelectedDeviceId(e.target.value)}
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
            onClick={() => { void handleActivate(); }}
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
