"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePatient } from "@/lib/hooks/use-patient";
import { usePatientSessions } from "@/lib/hooks/use-patient-sessions";
import { useAuth } from "@/features/auth/use-auth";
import { patientsApi } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { SessionDTO } from "@/types/api";

interface PatientDetailPageProps {
  params: { patientId: string };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusLabel(s: SessionDTO["status"]): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sessionStatusColor(s: SessionDTO["status"]): string {
  switch (s) {
    case "running":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "aborted":
    case "failed":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const router = useRouter();
  const { patientId } = params;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { patient, isLoading, error, reload } = usePatient(patientId);
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = usePatientSessions(patientId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleDeactivate() {
    setActionError(null);
    setActionLoading(true);
    try {
      await patientsApi.deactivate(patientId);
      reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("An unexpected error occurred.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate() {
    setActionError(null);
    setActionLoading(true);
    try {
      await patientsApi.reactivate(patientId);
      reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("An unexpected error occurred.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patient</h2>
        <p className="text-sm text-slate-500">Loading patient...</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patient</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Session not valid</p>
          <p className="mt-1 text-sm text-amber-700">
            Your session has expired. Please{" "}
            <a href="/login" className="underline font-medium">
              log in again
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patient</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">
            Your role does not have permission to view this patient.
          </p>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patient</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Patient not found</p>
          <p className="mt-1 text-sm text-slate-600">
            The patient with ID <code className="font-mono">{patientId}</code> does not exist.
          </p>
          <button
            type="button"
            onClick={() => router.push("/patients")}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patient</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error loading patient</p>
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

  if (!patient) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/patients")}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Back
        </button>
        <h2 className="text-xl font-semibold">
          {patient.first_name} {patient.last_name}
        </h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            patient.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}
        >
          {patient.active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Clinical data card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Clinical Information</h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Birth date</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDate(patient.birth_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gender</dt>
            <dd className="mt-1 text-sm text-slate-900">{patient.gender ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact email</dt>
            <dd className="mt-1 text-sm text-slate-900">{patient.contact_email ?? "—"}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</dt>
            <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
              {patient.description ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDate(patient.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Updated</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDate(patient.updated_at)}</dd>
          </div>
          {patient.deactivated_at && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Deactivated</dt>
              <dd className="mt-1 text-sm text-slate-900">{formatDate(patient.deactivated_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push(`/patients/${patientId}/edit`)}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>

        {patient.active && (
          <button
            type="button"
            onClick={() => { void handleDeactivate(); }}
            disabled={actionLoading}
            className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? "Processing..." : "Deactivate"}
          </button>
        )}

        {!patient.active && isAdmin && (
          <button
            type="button"
            onClick={() => { void handleReactivate(); }}
            disabled={actionLoading}
            className="rounded-full border border-green-200 px-5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? "Processing..." : "Reactivate"}
          </button>
        )}
      </div>

      {/* Session history */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">Session History</h3>
        </div>

        {sessionsLoading ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">Loading sessions...</div>
        ) : sessionsError ? (
          <div className="px-6 py-8 text-center text-sm text-slate-600">
            Could not load sessions: {sessionsError.message}
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No sessions recorded for this patient.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Session ID</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Started</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ended</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr key={session.session_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {session.session_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sessionStatusColor(session.status)}`}
                    >
                      {statusLabel(session.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(session.started_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(session.ended_at)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {session.score_value !== null ? session.score_value : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
