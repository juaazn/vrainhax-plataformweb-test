"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { devicesApi } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { DeviceCreatePayload, DeviceCreateResponse } from "@/types/api";

interface FormState {
  device_name: string;
  device_type: string;
  serial_number: string;
  firmware_version: string;
  notes: string;
}

const emptyForm: FormState = {
  device_name: "",
  device_type: "",
  serial_number: "",
  firmware_version: "",
  notes: "",
};

type SubmitStatus = "idle" | "submitting" | "error_401" | "error_403" | "error";

type ValidationErrors = Partial<Record<keyof FormState, string>>;

// ----- Initial Secret Panel -----

interface InitialSecretPanelProps {
  device: DeviceCreateResponse;
}

function InitialSecretPanel({ device }: InitialSecretPanelProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(device.device_secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Device Created</h2>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-1">
        <p className="text-sm font-medium text-green-800">
          Device &ldquo;{device.device_name}&rdquo; was registered successfully.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Initial Secret</h3>

        <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Copy this secret now. It will not be shown again.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <code className="flex-1 font-mono text-sm break-all text-slate-800">
            {device.device_secret}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded px-2.5 py-1 text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push(`/devices/${device.device_id}`)}
        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Go to device
      </button>
    </div>
  );
}

// ----- New Device Page -----

export default function NewDevicePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [createdDevice, setCreatedDevice] = useState<DeviceCreateResponse | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name as keyof FormState]) {
      setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const errors: ValidationErrors = {};
    if (!form.device_name.trim()) errors.device_name = "Device name is required.";
    if (!form.device_type.trim()) errors.device_type = "Device type is required.";
    if (!form.serial_number.trim()) errors.serial_number = "Serial number is required.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setErrorMessage("");

    const payload: DeviceCreatePayload = {
      name: form.device_name.trim(),
      type: form.device_type.trim(),
      serial_number: form.serial_number.trim(),
    };
    if (form.firmware_version.trim()) payload.firmware_version = form.firmware_version.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      const created = await devicesApi.create(payload);
      setCreatedDevice(created);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setStatus("error_401");
          return;
        }
        if (err.status === 403) {
          setStatus("error_403");
          return;
        }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
      setStatus("error");
    }
  }

  if (status === "error_401") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">New Device</h2>
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

  if (status === "error_403") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">New Device</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">
            Your role does not have permission to register devices.
          </p>
          <button
            type="button"
            onClick={() => router.push("/devices")}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Back to Devices
          </button>
        </div>
      </div>
    );
  }

  if (createdDevice !== null) {
    return <InitialSecretPanel device={createdDevice} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/devices")}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <h2 className="text-xl font-semibold">New Device</h2>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Device name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="device_name"
            value={form.device_name}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="e.g. VR Headset Alpha"
          />
          {validationErrors.device_name && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.device_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Device type <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="device_type"
            value={form.device_type}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="e.g. headset"
          />
          {validationErrors.device_type && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.device_type}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Serial number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="serial_number"
            value={form.serial_number}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="e.g. SN-ALPHA-001"
          />
          {validationErrors.serial_number && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.serial_number}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Firmware version</label>
          <input
            type="text"
            name="firmware_version"
            value={form.firmware_version}
            onChange={handleChange}
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="e.g. 1.2.3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            disabled={status === "submitting"}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            placeholder="Optional notes about this device..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "submitting" ? "Registering..." : "Register Device"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/devices")}
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
