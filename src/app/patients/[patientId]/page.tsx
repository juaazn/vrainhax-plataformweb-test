"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { usePatient } from "@/lib/hooks/use-patient";
import { usePatientProgress } from "@/lib/hooks/use-patient-progress";
import { useAuth } from "@/features/auth/use-auth";
import { patientsApi, ApiError } from "@/lib/api";
import type { SessionProgressItemDTO } from "@/types/api";

function calcAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return `${age} años`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function sessionStatusColor(status: string): string {
  switch (status) {
    case "running": return "bg-blue-100 text-blue-700";
    case "completed": return "bg-green-100 text-green-700";
    case "cancelled": return "bg-slate-100 text-slate-500";
    case "pending": return "bg-amber-100 text-amber-700";
    default: return "bg-red-100 text-red-600";
  }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function RecentSessionRow({ session }: { session: SessionProgressItemDTO }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link href={`/sessions/${session.session_id}`} className="font-mono text-xs text-blue-600 hover:underline">
          {session.session_id.slice(0, 8)}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sessionStatusColor(session.status)}`}>
          {session.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{session.module_name ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{session.variant_name ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(session.started_at)}</td>
      <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">{formatDuration(session.elapsed_seconds)}</td>
      <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
        {session.score_value !== null ? session.score_value : "—"}
      </td>
      <td className="px-4 py-3">
        <Link href={`/sessions/${session.session_id}`} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          Ver →
        </Link>
      </td>
    </tr>
  );
}

export default function PatientDetailPage() {
  const router = useRouter();
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPatient = user?.role === "patient";

  const { patient, isLoading, error, reload } = usePatient(patientId);
  const { progress, isLoading: progressLoading } = usePatientProgress(patientId, { limit: 10 });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmReactivate, setConfirmReactivate] = useState(false);

  async function handleDeactivate() {
    setActionError(null);
    setActionLoading(true);
    try {
      await patientsApi.deactivate(patientId);
      setConfirmDeactivate(false);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Error inesperado.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate() {
    setActionError(null);
    setActionLoading(true);
    try {
      await patientsApi.reactivate(patientId);
      setConfirmReactivate(false);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Error inesperado.");
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ficha del paciente</h2>
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ficha del paciente</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Sesión expirada</p>
          <p className="mt-1 text-sm text-amber-700">
            Por favor{" "}
            <a href="/login" className="underline font-medium">inicia sesión de nuevo</a>.
          </p>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ficha del paciente</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Acceso denegado</p>
          <p className="mt-1 text-sm text-red-700">No tienes permiso para ver este paciente.</p>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ficha del paciente</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Paciente no encontrado</p>
          <p className="mt-1 text-sm text-slate-600">
            El paciente con ID <code className="font-mono">{patientId}</code> no existe.
          </p>
          <button
            type="button"
            onClick={() => router.push("/patients")}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Volver a Pacientes
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ficha del paciente</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error al cargar</p>
          <p className="mt-1 text-sm text-slate-600">{error.message}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const totals = progress?.totals ?? null;
  const recentSessions = progress?.sessions ?? [];
  const warnings = progress?.warnings ?? [];
  const lastScore = progress?.series.score_over_time.at(-1)?.value ?? null;

  return (
    <div className="space-y-6">
      {/* A. Cabecera clínica */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/patients")}
              className="mt-0.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ← Pacientes
            </button>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                {patient.birth_date && (
                  <span>{calcAge(patient.birth_date)} · {formatDate(patient.birth_date)}</span>
                )}
                {patient.gender && <span>{patient.gender}</span>}
                {patient.contact_email && <span>{patient.contact_email}</span>}
                <span>Alta: {formatDate(patient.created_at)}</span>
              </div>
              {patient.description && (
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{patient.description}</p>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${patient.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {patient.active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* B. Acciones rápidas */}
      {!isPatient && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/sessions/new?patientId=${patientId}`}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nueva sesión
          </Link>
          <Link
            href={`/patients/${patientId}/progress`}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Historial completo
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/patients/${patientId}/edit`)}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Editar
          </button>

          {patient.active && (
            !confirmDeactivate ? (
              <button
                type="button"
                onClick={() => setConfirmDeactivate(true)}
                disabled={actionLoading}
                className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dar de baja
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">¿Confirmar baja?</span>
                <button
                  type="button"
                  onClick={() => { void handleDeactivate(); }}
                  disabled={actionLoading}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Procesando..." : "Sí, dar de baja"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeactivate(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  No
                </button>
              </div>
            )
          )}

          {!patient.active && isAdmin && (
            !confirmReactivate ? (
              <button
                type="button"
                onClick={() => setConfirmReactivate(true)}
                disabled={actionLoading}
                className="rounded-full border border-green-200 px-5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reactivar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">¿Confirmar reactivación?</span>
                <button
                  type="button"
                  onClick={() => { void handleReactivate(); }}
                  disabled={actionLoading}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? "Procesando..." : "Sí, reactivar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReactivate(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  No
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* C. Resumen de progreso */}
      {!isPatient && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-800">Resumen de progreso</h3>
          {progressLoading ? (
            <p className="text-sm text-slate-500">Cargando resumen...</p>
          ) : totals ? (
            <>
              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-800">⚠ {w}</p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Total sesiones" value={totals.total_sessions} />
                <StatCard label="Completadas" value={totals.completed_sessions} />
                <StatCard label="Canceladas" value={totals.cancelled_sessions} />
                <StatCard label="Tiempo total" value={formatDuration(totals.total_elapsed_seconds)} />
                <StatCard label="Con métricas" value={totals.sessions_with_metrics} sub={`de ${totals.total_sessions}`} />
                <StatCard label="Último score" value={lastScore !== null ? lastScore : "—"} />
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* D. Sesiones recientes */}
      {!isPatient && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Sesiones recientes</h3>
            <Link href={`/patients/${patientId}/progress`} className="text-sm text-slate-500 hover:text-slate-800">
              Ver historial completo →
            </Link>
          </div>
          {progressLoading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">Cargando sesiones...</div>
          ) : recentSessions.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No hay sesiones registradas para este paciente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Módulo</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Variante</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Duración</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Score</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSessions.map((session) => (
                    <RecentSessionRow key={session.session_id} session={session} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
