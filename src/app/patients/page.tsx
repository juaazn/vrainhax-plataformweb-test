"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePatients } from "@/lib/hooks/use-patients";
import { useAuth } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";

export default function PatientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "therapist";
  const { patients, isLoading, error, reload } = usePatients();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patients</h2>
        <p className="text-sm text-slate-500">Loading patients…</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patients</h2>
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
        <h2 className="text-xl font-semibold">Patients</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">Your role does not have permission to view patients.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patients</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error loading patients</p>
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
        <h2 className="text-xl font-semibold">Patients</h2>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Link
              href="/patients/new"
              className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + New Patient
            </Link>
          )}
          <button
            type="button"
            onClick={reload}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reload
          </button>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No active patients registered.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Full name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Contact email</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Gender</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Birth date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient) => (
                <tr
                  key={patient.patient_id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/patients/${patient.patient_id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {patient.first_name} {patient.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{patient.contact_email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.gender ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{patient.birth_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        patient.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {patient.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
