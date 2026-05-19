"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { usePatientProgress } from "@/lib/hooks/use-patient-progress";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format-date";
import type { SessionProgressItemDTO } from "@/types/api";

interface Props {
  params: { patientId: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  running: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  aborted: "Abortada",
  failed: "Fallida",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-500",
  aborted: "bg-red-100 text-red-600",
  failed: "bg-red-100 text-red-600",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SessionRow({ session }: { session: SessionProgressItemDTO }) {
  const statusLabel = STATUS_LABELS[session.status] ?? session.status;
  const statusStyle =
    STATUS_STYLES[session.status] ?? "bg-slate-100 text-slate-500";
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link
          href={`/sessions/${session.session_id}`}
          className="font-mono text-xs text-blue-600 hover:underline"
        >
          {session.session_id.slice(0, 8)}…
        </Link>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">
        {session.module_name ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {session.variant_name ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {formatDate(session.started_at ?? undefined)}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {formatDuration(session.elapsed_seconds)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-slate-700">
        {session.score_value ?? "—"}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PatientProgressPage({ params }: Props) {
  const { patientId } = params;
  const router = useRouter();
  const { user } = useAuth();
  const isPatient = user?.role === "patient";

  const { progress, isLoading, error, reload } = usePatientProgress(
    patientId,
    { limit: 50 },
  );

  // Patient role — no access to clinical workspace
  if (isPatient) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Historial de progreso</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Acceso denegado</p>
          <p className="mt-1 text-sm text-red-700">
            No tienes permiso para ver el historial clínico.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Historial de progreso</h2>
        <p className="text-sm text-slate-500">Cargando historial…</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Historial de progreso</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Sesión expirada</p>
          <p className="mt-1 text-sm text-amber-700">
            Por favor inicia sesión de nuevo.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Historial de progreso</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Acceso denegado</p>
          <p className="mt-1 text-sm text-red-700">
            No tienes permiso para ver el historial de este paciente.
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

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Historial de progreso</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Paciente no encontrado</p>
          <p className="mt-1 text-sm text-slate-600">
            El paciente con ID{" "}
            <code className="font-mono">{patientId}</code> no existe.
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
        <h2 className="text-xl font-semibold">Historial de progreso</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error al cargar el historial</p>
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

  if (!progress) return null;

  const { totals, sessions, warnings } = progress;
  const patientName = progress.patient.full_name;
  const totalMinutes = Math.floor(totals.total_elapsed_seconds / 60);
  const lastScore = progress.series.score_over_time.at(-1)?.value ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Volver al paciente
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Historial de progreso
          </h2>
          <p className="text-sm text-slate-500">{patientName}</p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w}
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Resumen</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total sesiones" value={totals.total_sessions} />
          <StatCard label="Completadas" value={totals.completed_sessions} />
          <StatCard label="Canceladas" value={totals.cancelled_sessions} />
          <StatCard
            label="Tiempo total"
            value={`${totalMinutes}m`}
            sub={`${totals.total_elapsed_seconds}s`}
          />
          <StatCard label="Con métricas" value={totals.sessions_with_metrics} />
          <StatCard label="Último score" value={lastScore ?? "—"} />
        </div>
      </div>

      {/* Sessions table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Sesiones
          {sessions.length > 0 ? ` (${sessions.length})` : ""}
        </h3>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No hay sesiones registradas para este paciente.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Sesión
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Módulo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Variante
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Inicio
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Duración
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <SessionRow key={s.session_id} session={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
