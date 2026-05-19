"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessions } from "@/lib/hooks/use-sessions";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/features/auth/use-auth";
import { formatDate } from "@/lib/format-date";
import type { SessionStatus, SessionListParams } from "@/types/api";

const STATUS_STYLES: Record<SessionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  aborted: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const ALL_STATUSES: SessionStatus[] = [
  "pending",
  "running",
  "completed",
  "aborted",
  "failed",
  "cancelled",
];

export default function SessionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "therapist";

  const [statusFilter, setStatusFilter] = useState<SessionStatus | "">("");
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<SessionListParams>({});

  const { sessions, isLoading, error, reload } = useSessions(
    Object.keys(appliedFilters).length > 0 ? appliedFilters : undefined,
  );

  function handleApply() {
    const filters: SessionListParams = {};
    if (statusFilter) filters.status = statusFilter;
    if (dateFromInput) filters.dateFrom = dateFromInput;
    if (dateToInput) filters.dateTo = dateToInput;
    setAppliedFilters(filters);
  }

  function handleReset() {
    setStatusFilter("");
    setDateFromInput("");
    setDateToInput("");
    setAppliedFilters({});
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <p className="text-sm text-slate-500">Loading sessions...</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Session not valid</p>
          <p className="mt-1 text-sm text-amber-700">Your session has expired. Please log in again.</p>
          <a href="/login" className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">Your role does not have permission to view sessions.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error loading sessions</p>
          <p className="mt-1 text-sm text-slate-600">{error.message}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <button
          type="button"
          onClick={reload}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Reload
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="status-filter" className="text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-from" className="text-xs font-medium text-slate-600">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFromInput}
            onChange={(e) => setDateFromInput(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="text-xs font-medium text-slate-600">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={dateToInput}
            onChange={(e) => setDateToInput(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={handleApply}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Reset
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <p className="text-sm text-slate-500">No se encontraron sesiones.</p>
          {canCreate && (
            <Link
              href="/sessions/new"
              className="inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Nueva sesión
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Sesión</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Paciente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Inicio</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Fin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr
                  key={session.session_id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/sessions/${session.session_id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {session.session_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${session.patient_id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {session.patient_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[session.status]}`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(session.started_at ?? undefined)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(session.ended_at ?? undefined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
