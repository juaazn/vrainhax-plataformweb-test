"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeviceRealtime } from "@/lib/hooks/use-device-realtime";
import { useDevices } from "@/lib/hooks/use-devices";
import { useAuth } from "@/features/auth/use-auth";
import { devicesApi } from "@/lib/api";
import { commandsApi } from "@/lib/api/commands-api";
import { sessionsApi } from "@/lib/api/sessions-api";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format-date";
import type { CommandSendResponse, CommandDTO, CommandStatus, CommandListResponse, DeviceDTO, SessionDTO } from "@/types/api";
import type { ClientRealtimeEvent, DeviceRealtimeState } from "@/types/realtime.types";

// ----- Command button hook -----

type CommandActionState = "idle" | "pending" | "success" | "error";

function useCommandAction(action: () => Promise<CommandSendResponse>) {
  const [state, setState] = useState<CommandActionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const execute = async () => {
    setState("pending");
    setErrorMsg(null);
    try {
      await action();
      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Command failed");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return { state, errorMsg, execute };
}

// ----- Realtime badge -----

function RealtimeBadge({ status }: { status?: DeviceRealtimeState["connectionStatus"] }) {
  if (!status || status === "disconnected") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium bg-slate-100 text-slate-500">
        Offline
      </span>
    );
  }
  if (status === "connected") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium bg-green-100 text-green-700">
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium bg-yellow-100 text-yellow-700">
      Busy
    </span>
  );
}

// ----- Command button -----

interface CommandButtonProps {
  label: string;
  action: () => Promise<CommandSendResponse>;
  disabled: boolean;
}

function CommandButton({ label, action, disabled }: CommandButtonProps) {
  const { state, errorMsg, execute } = useCommandAction(action);

  const isPending = state === "pending";
  const isSuccess = state === "success";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={execute}
        disabled={disabled || isPending}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          disabled || isPending
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : isSuccess
              ? "bg-green-100 text-green-700"
              : state === "error"
                ? "bg-red-100 text-red-700"
                : "bg-slate-900 text-white hover:bg-slate-700"
        }`}
      >
        {isPending ? "Sending…" : isSuccess ? "Sent!" : label}
      </button>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  );
}

// ----- Event item -----

function EventItem({ event }: { event: ClientRealtimeEvent }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="shrink-0 mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
        {event.eventType}
      </span>
      <span className="text-xs text-slate-500">{formatDate(event.occurredAt)}</span>
    </div>
  );
}

// ----- Command history hook -----

interface CommandHistoryFilters {
  status?: CommandStatus | '';
  commandName?: string;
  page?: number;
}

function useCommandHistory(
  deviceId: string,
  filters: CommandHistoryFilters,
  refreshTick: number,
) {
  const [commands, setCommands] = useState<CommandDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<CommandListResponse['pagination'] | null>(null);

  const statusFilter = filters.status;
  const commandNameFilter = filters.commandName;
  const pageFilter = filters.page;

  useEffect(() => {
    let cancelled = false;

    const fetchCommands = async () => {
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await commandsApi.listCommands({
          deviceId,
          ...(statusFilter ? { status: statusFilter as CommandStatus } : {}),
          ...(commandNameFilter ? { commandName: commandNameFilter } : {}),
          page: pageFilter ?? 1,
          limit: 20,
        });
        if (!cancelled) {
          setCommands(result.data);
          setPagination(result.pagination);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load commands');
          setCommands([]);
          setPagination(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchCommands();
    return () => { cancelled = true; };
  }, [deviceId, statusFilter, commandNameFilter, pageFilter, refreshTick]);

  return { commands, isLoading, error, pagination };
}

// ----- Command status badge -----

function CommandStatusBadge({ status }: { status: CommandDTO["status"] }) {
  const styles: Record<CommandDTO["status"], string> = {
    sent:      "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    executed:  "bg-green-100 text-green-700",
    failed:    "bg-red-100 text-red-700",
    timeout:   "bg-orange-100 text-orange-700",
    queued:    "bg-slate-100 text-slate-500",
  };
  const labels: Record<CommandDTO["status"], string> = {
    sent:      "Sent",
    delivered: "Delivered",
    executed:  "Executed",
    failed:    "Failed",
    timeout:   "Timeout",
    queued:    "Queued",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ----- Command history panel -----

const COMMAND_NAME_OPTIONS = [
  { value: '', label: 'All commands' },
  { value: 'command.recenter_view', label: 'recenter_view' },
  { value: 'command.start_session', label: 'start_session' },
  { value: 'command.pause_session', label: 'pause_session' },
  { value: 'command.resume_session', label: 'resume_session' },
  { value: 'command.end_session', label: 'end_session' },
  { value: 'command.update_config', label: 'update_config' },
];

const STATUS_OPTIONS: Array<{ value: CommandStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'executed', label: 'Executed' },
  { value: 'failed', label: 'Failed' },
  { value: 'timeout', label: 'Timeout' },
];

function CommandHistoryPanel({ deviceId }: { deviceId: string }) {
  const [statusFilter, setStatusFilter] = useState<CommandStatus | ''>('');
  const [commandNameFilter, setCommandNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);

  const filters: CommandHistoryFilters = {
    status: statusFilter,
    commandName: commandNameFilter,
    page,
  };

  const { commands, isLoading, error, pagination } = useCommandHistory(deviceId, filters, refreshTick);

  const handleStatusChange = (value: CommandStatus | '') => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleCommandNameChange = (value: string) => {
    setCommandNameFilter(value);
    setPage(1);
  };

  const totalLabel =
    pagination != null
      ? `Showing ${commands.length} of ${pagination.total}`
      : `${commands.length} commands`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Command History
        </h3>
        <button
          type="button"
          aria-label="Refresh command history"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as CommandStatus | '')}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by command"
          value={commandNameFilter}
          onChange={(e) => handleCommandNameChange(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {COMMAND_NAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : error != null ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : commands.length === 0 ? (
        <p className="text-sm text-slate-400">No commands sent to this device.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {commands.map((cmd) => (
            <div key={cmd.command_id} className="py-2 flex items-start gap-3 text-sm">
              <CommandStatusBadge status={cmd.status} />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-slate-700">
                  {cmd.command_name.replace(/^command\./, '')}
                </span>
                <div className="text-xs text-slate-400 mt-0.5">
                  Sent: {formatDate(cmd.sent_at)}
                  {cmd.executed_at && <> · Executed: {formatDate(cmd.executed_at)}</>}
                </div>
                {cmd.error_message && (
                  <p className="text-xs text-red-600 mt-0.5">{cmd.error_message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination footer */}
      {pagination != null && (
        <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
          <span>{totalLabel}</span>
          {pagination.totalPages > 1 && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-1">
                {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----- Device Credential Section -----

interface DeviceCredentialSectionProps {
  deviceId: string;
  lastRotatedAt: string | null;
}

function DeviceCredentialSection({ deviceId, lastRotatedAt }: DeviceCredentialSectionProps) {
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRotateSecret = async () => {
    setIsRotating(true);
    setRotateError(null);
    try {
      const { device_secret } = await devicesApi.rotateSecret(deviceId);
      setRotatedSecret(device_secret);
    } catch (e) {
      setRotateError(e instanceof Error ? e.message : 'Error al rotar el secreto');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopy = () => {
    if (rotatedSecret) {
      void navigator.clipboard.writeText(rotatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lastRotatedLabel = lastRotatedAt ? formatDate(lastRotatedAt) : 'Never';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Device Credential</h3>

      {lastRotatedAt ? (
        <p className="text-xs text-green-700">
          &#10003; Credential configured (rotated: {lastRotatedLabel})
        </p>
      ) : (
        <p className="text-xs text-amber-700">
          &#9888; No credential set &mdash; device cannot connect to WebSocket
        </p>
      )}

      <button
        type="button"
        onClick={() => { void handleRotateSecret(); }}
        disabled={isRotating}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          isRotating
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 text-white hover:bg-slate-700'
        }`}
      >
        {isRotating ? 'Rotating…' : 'Rotate Device Secret'}
      </button>

      {rotateError && (
        <p className="text-xs text-red-600">{rotateError}</p>
      )}

      {rotatedSecret !== null && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Warning: Copy this secret now. It will not be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="flex-1 font-mono text-sm break-all text-slate-800">
              {rotatedSecret}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded px-2.5 py-1 text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Provisioning Checklist -----

interface ProvisioningChecklistProps {
  device: import('@/types/api').DeviceDTO;
}

function ProvisioningChecklist({ device }: ProvisioningChecklistProps) {
  const steps: Array<{ label: string; checked: boolean; manual?: boolean }> = [
    { label: 'Device created', checked: true },
    {
      label: 'Secret copied',
      checked: device.device_secret_last_rotated_at !== null,
    },
    { label: 'Secret pasted in Unity Inspector (cannot verify — manual)', checked: false, manual: true },
    {
      label: 'Device connected',
      checked: device.last_authenticated_at !== null,
    },
    {
      label: 'Device online',
      checked: device.active === true,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Provisioning Checklist</h3>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span
              className={`shrink-0 font-mono text-base leading-tight ${
                step.checked
                  ? 'text-green-600'
                  : step.manual
                    ? 'text-slate-400'
                    : 'text-slate-300'
              }`}
            >
              {step.checked ? '☑' : '☐'}
            </span>
            <span
              className={
                step.checked
                  ? 'text-slate-700'
                  : step.manual
                    ? 'text-slate-500 italic'
                    : 'text-slate-400'
              }
            >
              {index + 1}. {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ----- Active Session Section -----

/**
 * Fetches the active session for a device using sessionsApi.list with
 * deviceId and status=running filters.
 * NOTE: This depends on the backend supporting deviceId and status query
 * params on GET /api/v1/sessions. If the backend does not support these
 * filters, the call will return all sessions and filtering here is not safe.
 * TODO: Confirm backend support for deviceId filter on /api/v1/sessions.
 */
function useActiveSession(deviceId: string) {
  const [activeSession, setActiveSession] = useState<SessionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSession() {
      setIsLoading(true);
      try {
        const sessions = await sessionsApi.list({ deviceId, status: 'running', limit: 1 });
        if (!cancelled) {
          setActiveSession(sessions[0] ?? null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          // If the endpoint doesn't support this filter or fails, degrade gracefully.
          setActiveSession(null);
          setIsLoading(false);
        }
      }
    }

    void fetchSession();
    return () => { cancelled = true; };
  }, [deviceId]);

  return { activeSession, isLoading };
}

interface ActiveSessionSectionProps {
  deviceId: string;
}

function ActiveSessionSection({ deviceId }: ActiveSessionSectionProps) {
  const { activeSession, isLoading } = useActiveSession(deviceId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Active Session</h3>
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : activeSession ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-700">
            Session:{" "}
            <span className="font-mono font-medium">#{activeSession.session_id.slice(0, 8)}</span>
          </span>
          {activeSession.patient_id && (
            <span className="text-sm text-slate-500">
              Patient ID:{" "}
              <span className="font-mono text-xs">{activeSession.patient_id.slice(0, 8)}</span>
            </span>
          )}
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
            {activeSession.status}
          </span>
          <Link
            href={`/sessions/${activeSession.session_id}`}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
          >
            View session
          </Link>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No active session</p>
      )}
    </div>
  );
}

// ----- Device Info Card -----

type DeviceActionState = "idle" | "pending" | "error";

interface DeviceInfoCardProps {
  device: DeviceDTO;
  isAdmin: boolean;
  onReload: () => void;
}

function DeviceInfoCard({ device, isAdmin, onReload }: DeviceInfoCardProps) {
  const router = useRouter();
  const [actionState, setActionState] = useState<DeviceActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    setActionState("pending");
    setActionError(null);
    try {
      await devicesApi.deactivate(device.device_id);
      onReload();
      setActionState("idle");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "Action failed");
      setActionError(msg);
      setActionState("error");
    }
  };

  const handleReactivate = async () => {
    setActionState("pending");
    setActionError(null);
    try {
      await devicesApi.reactivate(device.device_id);
      onReload();
      setActionState("idle");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "Action failed");
      setActionError(msg);
      setActionState("error");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Device Info</h3>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/devices/${device.device_id}/edit`)}
              className="rounded-md px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Edit
            </button>
            {device.active ? (
              <button
                type="button"
                aria-label="Deactivate device"
                onClick={() => { void handleDeactivate(); }}
                disabled={actionState === "pending"}
                className="rounded-md px-3 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionState === "pending" ? "Working…" : "Deactivate"}
              </button>
            ) : (
              <button
                type="button"
                aria-label="Reactivate device"
                onClick={() => { void handleReactivate(); }}
                disabled={actionState === "pending"}
                className="rounded-md px-3 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionState === "pending" ? "Working…" : "Reactivate"}
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <p className="text-xs text-red-600">{actionError}</p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-slate-500">Name</dt>
        <dd className="text-slate-700">{device.device_name}</dd>
        <dt className="text-slate-500">Type</dt>
        <dd className="text-slate-700">{device.device_type}</dd>
        <dt className="text-slate-500">Serial</dt>
        <dd className="font-mono text-xs text-slate-700">{device.serial_number}</dd>
        <dt className="text-slate-500">Firmware</dt>
        <dd className="text-slate-700">{device.firmware_version ?? "—"}</dd>
        <dt className="text-slate-500">Notes</dt>
        <dd className="text-slate-700">{device.notes ?? "—"}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              device.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {device.active ? "Active" : "Inactive"}
          </span>
        </dd>
        <dt className="text-slate-500">Created</dt>
        <dd className="text-slate-700">{formatDate(device.created_at)}</dd>
      </dl>
    </div>
  );
}

// ----- Client component -----

export function DeviceDetailClient({ deviceId }: { deviceId: string }) {
  const { connectionState, deviceStates, recentEvents } = useDeviceRealtime();
  const { devices, isLoading, reload } = useDevices();
  const { user } = useAuth();
  const { activeSession } = useActiveSession(deviceId);

  const isAdmin = user?.role === "admin";
  const isAdminOrTherapist = isAdmin || user?.role === "therapist";

  const staticDevice = useMemo(
    () => devices.find((d) => d.device_id === deviceId) ?? null,
    [devices, deviceId],
  );

  const realtimeDevice = deviceStates.get(deviceId);
  const isOnline = realtimeDevice?.connectionStatus === "connected";
  const isBusy = realtimeDevice?.connectionStatus === "busy";
  const canCommand = isOnline || isBusy;

  // Use the active session's ID for commands when available,
  // falling back to the realtime-reported session ID.
  const commandSessionId = activeSession?.session_id ?? realtimeDevice?.sessionId;

  const deviceEvents = recentEvents.filter((e) => e.deviceId === deviceId);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <div>
        <Link
          href="/devices"
          className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
        >
          Back to Devices
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">
          {staticDevice?.device_name ?? (isLoading ? "Loading…" : deviceId)}
        </h2>
        <RealtimeBadge status={realtimeDevice?.connectionStatus} />
        {(connectionState === "connecting" || connectionState === "reconnecting") && (
          <span className="text-xs text-slate-400">{connectionState}…</span>
        )}
      </div>

      {/* Device Info card */}
      {staticDevice ? (
        <DeviceInfoCard device={staticDevice} isAdmin={isAdmin} onReload={reload} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Device Info</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-slate-500">Device ID</dt>
            <dd className="font-mono text-xs text-slate-700">{deviceId}</dd>
          </dl>
        </div>
      )}

      {/* Device Credential section — admin only */}
      {isAdmin && (
        <DeviceCredentialSection
          deviceId={deviceId}
          lastRotatedAt={staticDevice?.device_secret_last_rotated_at ?? null}
        />
      )}

      {/* Provisioning Checklist — admin only */}
      {isAdmin && staticDevice && (
        <ProvisioningChecklist device={staticDevice} />
      )}

      {/* Realtime status card */}
      {realtimeDevice && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Realtime Status</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-slate-500">Connection</dt>
            <dd>
              <RealtimeBadge status={realtimeDevice.connectionStatus} />
            </dd>
            <dt className="text-slate-500">Last heartbeat</dt>
            <dd className="text-slate-700">{formatDate(realtimeDevice.lastSeenAt ?? undefined)}</dd>
            <dt className="text-slate-500">Session</dt>
            <dd className="font-mono text-xs text-slate-700">
              {realtimeDevice.sessionId ?? "None"}
            </dd>
            <dt className="text-slate-500">Battery</dt>
            <dd className="text-slate-700">
              {realtimeDevice.batteryLevel != null ? `${realtimeDevice.batteryLevel}%` : "—"}
            </dd>
            <dt className="text-slate-500">Scene</dt>
            <dd className="text-slate-700">{realtimeDevice.scene ?? "—"}</dd>
          </dl>
        </div>
      )}

      {/* Active Session section — admin and therapist only */}
      {isAdminOrTherapist && (
        <ActiveSessionSection deviceId={deviceId} />
      )}

      {/* Commands card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Commands</h3>
          {!canCommand && (
            <span className="text-xs text-slate-400">Device must be online to send commands</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <CommandButton
            label="Recenter View"
            disabled={!canCommand}
            action={() => commandsApi.recenterView(deviceId, commandSessionId)}
          />
          <CommandButton
            label="Pause Session"
            disabled={!canCommand}
            action={() => commandsApi.pauseSession(deviceId, commandSessionId)}
          />
          <CommandButton
            label="Resume Session"
            disabled={!canCommand}
            action={() => commandsApi.resumeSession(deviceId, commandSessionId)}
          />
          <CommandButton
            label="End Session"
            disabled={!canCommand}
            action={() => commandsApi.endSession(deviceId, commandSessionId)}
          />
        </div>
      </div>

      {/* Recent events */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Recent Events ({deviceEvents.length})
        </h3>
        {deviceEvents.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet for this device.</p>
        ) : (
          <div>
            {deviceEvents.map((event, idx) => (
              <EventItem key={`${event.occurredAt}-${idx}`} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Command history */}
      <CommandHistoryPanel deviceId={deviceId} />
    </div>
  );
}
