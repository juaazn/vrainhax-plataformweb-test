"use client";

import { useState } from 'react';
import { DynamicConfigForm } from './DynamicConfigForm';
import { usePatients } from '@/lib/hooks/use-patients';
import { useDevices } from '@/lib/hooks/use-devices';
import { sessionsApi, ApiError } from '@/lib/api';
import type { JsonSchema7 } from '@/types/api/variant.types';
import type { SessionDTO } from '@/types/api';

export interface SessionActivateFormProps {
  variantId: string;
  configSchema: JsonSchema7;
  onSuccess: (session: SessionDTO) => void;
  onCancel?: () => void;
}

export function SessionActivateForm({
  variantId,
  configSchema,
  onSuccess,
  onCancel,
}: SessionActivateFormProps) {
  const { patients, isLoading: patientsLoading } = usePatients();
  const { devices, isLoading: devicesLoading } = useDevices();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfigSubmit(config: Record<string, unknown>) {
    if (!selectedPatientId) {
      setError('Selecciona un paciente');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await sessionsApi.activate({
        patientId: selectedPatientId,
        variantId,
        deviceId: selectedDeviceId || undefined,
        config,
      });
      onSuccess(response.session);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Sesion expirada. Recarga la pagina.');
        } else if (err.status === 403) {
          setError('No tienes permiso para crear sesiones.');
        } else if (err.status === 409) {
          setError('El dispositivo ya esta en uso en otra sesion.');
        } else if (err.status === 400) {
          setError(`Error de validacion: ${err.message}`);
        } else {
          setError(`Error del servidor: ${err.message}`);
        }
      } else {
        setError('Error de red. Verifica la conexion con el backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Patient selector */}
      <div className="space-y-1">
        <label htmlFor="patient-select" className="block text-sm font-medium text-slate-700">
          Paciente <span className="text-red-500">*</span>
        </label>
        {patientsLoading ? (
          <p className="text-sm text-slate-500">Cargando pacientes...</p>
        ) : (
          <select
            id="patient-select"
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              if (error === 'Selecciona un paciente') setError(null);
            }}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Selecciona un paciente --</option>
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Device selector */}
      <div className="space-y-1">
        <label htmlFor="device-select" className="block text-sm font-medium text-slate-700">
          Dispositivo
        </label>
        {devicesLoading ? (
          <p className="text-sm text-slate-500">Cargando dispositivos...</p>
        ) : (
          <select
            id="device-select"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Sin dispositivo</option>
            {devices.map((d) => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_name} ({d.device_type})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Global error message */}
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Dynamic config form — its submit button drives the full flow */}
      <DynamicConfigForm
        schema={configSchema}
        onSubmit={handleConfigSubmit}
        onCancel={onCancel}
        submitLabel={isSubmitting ? 'Creando sesion...' : 'Activar sesion'}
        disabled={isSubmitting}
      />
    </div>
  );
}
