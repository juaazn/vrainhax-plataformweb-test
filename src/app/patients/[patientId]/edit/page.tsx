"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { patientsApi } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { PatientPatchPayload } from "@/types/api";

interface FormState {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  contact_email: string;
  description: string;
}

type PageStatus =
  | "loading"
  | "idle"
  | "submitting"
  | "error_401"
  | "error_403"
  | "error_404"
  | "error";

export default function EditPatientPage() {
  const router = useRouter();
  const { patientId } = useParams<{ patientId: string }>();

  // Start in loading — data is always fetched on mount
  const [status, setStatus] = useState<PageStatus>("loading");
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "",
    contact_email: "",
    description: "",
  });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    let cancelled = false;

    patientsApi
      .getById(patientId)
      .then((patient) => {
        if (cancelled) return;
        setForm({
          first_name: patient.first_name,
          last_name: patient.last_name,
          birth_date: patient.birth_date ?? "",
          gender: patient.gender ?? "",
          contact_email: patient.contact_email ?? "",
          description: patient.description ?? "",
        });
        setStatus("idle");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 401) { setStatus("error_401"); return; }
          if (err.status === 403) { setStatus("error_403"); return; }
          if (err.status === 404) { setStatus("error_404"); return; }
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("An unexpected error occurred.");
        }
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [patientId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name as keyof FormState]) {
      setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const errors: Partial<FormState> = {};
    if (!form.first_name.trim()) errors.first_name = "First name is required.";
    if (!form.last_name.trim()) errors.last_name = "Last name is required.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setErrorMessage("");

    const payload: PatientPatchPayload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
    };
    if (form.birth_date) payload.birth_date = form.birth_date;
    if (form.gender) payload.gender = form.gender;
    if (form.contact_email.trim()) payload.contact_email = form.contact_email.trim();
    if (form.description.trim()) payload.description = form.description.trim();

    try {
      await patientsApi.patch(patientId, payload);
      router.push(`/patients/${patientId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) { setStatus("error_401"); return; }
        if (err.status === 403) { setStatus("error_403"); return; }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
      setStatus("error");
    }
  }

  // --- Loading state ---
  if (status === "loading") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit Patient</h2>
        <p className="text-sm text-slate-500">Loading patient data...</p>
      </div>
    );
  }

  // --- 401 state ---
  if (status === "error_401") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit Patient</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Session not valid</p>
          <p className="mt-1 text-sm text-amber-700">Your session has expired. Please log in again.</p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // --- 403 state ---
  if (status === "error_403") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit Patient</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">
            Your role does not have permission to edit this patient.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/patients/${patientId}`)}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Back to Patient
          </button>
        </div>
      </div>
    );
  }

  // --- 404 state ---
  if (status === "error_404") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit Patient</h2>
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

  // --- Form (idle / submitting / error on submit) ---
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/patients/${patientId}`)}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <h2 className="text-xl font-semibold">Edit Patient</h2>
      </div>

      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 max-w-xl"
      >
        {status === "error" && errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              disabled={status === "submitting"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="First name"
            />
            {validationErrors.first_name && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.first_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              disabled={status === "submitting"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="Last name"
            />
            {validationErrors.last_name && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.last_name}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Birth date</label>
          <input
            type="date"
            name="birth_date"
            value={form.birth_date}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact email</label>
          <input
            type="email"
            name="contact_email"
            value={form.contact_email}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="patient@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            disabled={status === "submitting"}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            placeholder="Clinical notes or description..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "submitting" ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/patients/${patientId}`)}
            disabled={status === "submitting"}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
