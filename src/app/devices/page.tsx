"use client";

import Link from "next/link";
import { useDevices } from "@/lib/hooks/use-devices";
import { useDeviceRealtime } from "@/lib/hooks/use-device-realtime";
import { useAuth } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format-date";
import type { DeviceRealtimeState } from "@/types/realtime.types";

function RealtimeBadge({ status }: { status?: DeviceRealtimeState["connectionStatus"] }) {
  if (!status || status === "disconnected") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
        Offline
      </span>
    );
  }
  if (status === "connected") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
      Busy
    </span>
  );
}

const WS_STATUS_LABELS: Record<string, string | null> = {
  idle: null,
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting…",
  disconnected: null,
  unavailable: "No active sessions",
  error: "Connection error",
};

export default function DevicesPage() {
  const { devices, isLoading, error, reload } = useDevices();
  const { connectionState, deviceStates } = useDeviceRealtime();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const wsLabel = WS_STATUS_LABELS[connectionState] ?? null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Devices</h2>
        <p className="text-sm text-slate-500">Loading devices…</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Devices</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Session not valid</p>
          <p className="mt-1 text-sm text-amber-700">Your session has expired. Please log in again.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Devices</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">Your role does not have permission to view devices.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Devices</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error loading devices</p>
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
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Devices</h2>
          {wsLabel && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                connectionState === "connected"
                  ? "bg-green-100 text-green-700"
                  : connectionState === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {wsLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/devices/new"
              className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              New Device
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

      {devices.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <p className="text-sm text-slate-500">No hay dispositivos registrados.</p>
          {isAdmin && (
            <Link
              href="/devices/new"
              className="inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Registrar dispositivo
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Serial</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Firmware</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Last seen</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Active</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Connection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((device) => {
                const realtimeState = deviceStates.get(device.device_id);
                return (
                  <tr key={device.device_id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/devices/${device.device_id}`}
                        className="hover:underline hover:text-blue-600"
                      >
                        {device.device_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{device.device_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {device.serial_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{device.firmware_version ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(device.last_seen_at ?? undefined)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          device.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {device.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RealtimeBadge status={realtimeState?.connectionStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
