"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import { useDevices } from "@/lib/hooks/use-devices";
import { useAuth } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";
import { sessionsApi } from "@/lib/api/sessions-api";
import { commandsApi } from "@/lib/api/commands-api";
import { formatDate } from "@/lib/format-date";
import type { SessionStatus, SessionDetailDTO, SessionEventDTO, TimelineItemDTO, TimelineListResponse, SessionSummaryDTO } from "@/types/api";
import type { CommandDTO, CommandSendResponse, CommandListResponse } from "@/types/api";

const STATUS_STYLES: Record<SessionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  aborted: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function durationMinutes(startedAt: string | null, endedAt: string | null): string | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const mins = Math.round((end - start) / 60000);
  return `${mins} min`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2">
      <span className="w-36 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

// ----- Session Summary -----

function useSessionSummary(sessionId: string, refreshTick?: number) {
  const [data, setData] = useState<SessionSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await sessionsApi.getSummary(sessionId);
        if (!cancelled) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load summary");
          setData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchSummary();
    return () => { cancelled = true; };
  }, [sessionId, refreshTick]);

  return { data, isLoading, error };
}

function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function SessionSummaryPanel({ sessionId }: { sessionId: string }) {
  const [refreshTick, setRefreshTick] = useState(0);
  const { data, isLoading, error } = useSessionSummary(sessionId, refreshTick);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Session Summary</h3>
        <button
          type="button"
          aria-label="Refresh summary"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading summary...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load summary</p>
      ) : data ? (
        <div className="space-y-4">
          {/* Info rows */}
          <div className="divide-y divide-slate-100">
            <InfoRow
              label="Patient"
              value={`${data.patient.first_name} ${data.patient.last_name}`}
            />
            <InfoRow
              label="Therapist"
              value={
                data.therapist.name
                  ? data.therapist.email
                    ? `${data.therapist.name} (${data.therapist.email})`
                    : data.therapist.name
                  : data.therapist.email ?? data.therapist.user_id
              }
            />
            <InfoRow
              label="Device"
              value={
                data.device
                  ? `${data.device.device_name}${data.device.serial_number ? ` #${data.device.serial_number}` : ""}`
                  : "No device assigned"
              }
            />
            <InfoRow
              label="Status"
              value={
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[data.status as SessionStatus] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {data.status}
                </span>
              }
            />
            <InfoRow
              label="Duration"
              value={
                data.duration_seconds !== undefined
                  ? formatDurationSeconds(data.duration_seconds)
                  : "In progress"
              }
            />
          </div>

          {/* Metrics grid */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Metrics</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {[
                { label: "Total events", value: data.metrics.total_events },
                { label: "Total commands", value: data.metrics.total_commands },
                { label: "Metrics received", value: data.metrics.total_metrics },
                { label: "Delivered", value: data.metrics.delivered_commands },
                { label: "Failed", value: data.metrics.failed_commands },
                { label: "Timeout", value: data.metrics.timeout_commands },
                ...(data.metrics.last_score !== undefined
                  ? [{ label: "Last score", value: data.metrics.last_score }]
                  : []),
                ...(data.metrics.total_repetitions !== undefined
                  ? [{ label: "Repetitions", value: data.metrics.total_repetitions }]
                  : []),
                ...(data.metrics.elapsed_seconds !== undefined
                  ? [{ label: "Elapsed", value: `${data.metrics.elapsed_seconds}s` }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col py-1">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlights */}
          {data.highlights.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Highlights</p>
              <ul className="space-y-1">
                {data.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="shrink-0">&#10003;</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Warnings</p>
              <ul className="space-y-1">
                {data.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="shrink-0">&#9888;</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ----- Operator Console helpers -----

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

interface ConsoleCommandButtonProps {
  label: string;
  action: () => Promise<CommandSendResponse>;
  disabled?: boolean;
  disabledTitle?: string;
}

function ConsoleCommandButton({ label, action, disabled = false, disabledTitle }: ConsoleCommandButtonProps) {
  const { state, errorMsg, execute } = useCommandAction(action);
  const isPending = state === "pending";
  const isSuccess = state === "success";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        title={disabled ? disabledTitle : undefined}
        onClick={() => { void execute(); }}
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
      {errorMsg && (
        <p className="text-xs text-red-600" role="alert">{errorMsg}</p>
      )}
    </div>
  );
}

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

function useSessionCommandHistory(sessionId: string, refreshTick: number) {
  const [commands, setCommands] = useState<CommandDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<CommandListResponse["pagination"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await commandsApi.listCommands({ sessionId, limit: 20 });
        if (!cancelled) {
          setCommands(result.data);
          setPagination(result.pagination);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load command history");
          setCommands([]);
          setPagination(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchHistory();
    return () => { cancelled = true; };
  }, [sessionId, refreshTick]);

  return { commands, isLoading, error, pagination };
}

// ----- Session Events -----

const EVENT_TYPE_STYLES: Record<string, string> = {
  "session.started":         "bg-green-100 text-green-700",
  "session.metric.received": "bg-blue-100 text-blue-700",
  "session.ended":           "bg-slate-100 text-slate-500",
};

function EventTypeBadge({ eventType }: { eventType: string }) {
  const style = EVENT_TYPE_STYLES[eventType] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {eventType}
    </span>
  );
}

const SUMMARY_KEYS = ["score", "repetitions", "elapsedSeconds", "status"];

function formatPayloadSummary(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of SUMMARY_KEYS) {
    if (payload[key] !== undefined) {
      parts.push(`${key}: ${String(payload[key])}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : "";
}

function useSessionEvents(sessionId: string, refreshTick: number) {
  const [events, setEvents] = useState<SessionEventDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await sessionsApi.listEvents(sessionId, { limit: 20 });
        if (!cancelled) {
          setEvents(result.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchEvents();
    return () => { cancelled = true; };
  }, [sessionId, refreshTick]);

  return { events, isLoading, error };
}

// ----- Session Timeline -----

function useSessionTimeline(
  sessionId: string,
  type: "all" | "command" | "event",
  page: number,
  refreshTick: number,
) {
  const [data, setData] = useState<TimelineItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TimelineListResponse["pagination"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTimeline = async () => {
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await sessionsApi.listTimeline(sessionId, { type, page, limit: 30 });
        if (!cancelled) {
          setData(result.data);
          setPagination(result.pagination);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load timeline");
          setData([]);
          setPagination(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchTimeline();
    return () => { cancelled = true; };
  }, [sessionId, type, page, refreshTick]);

  return { data, isLoading, error, pagination };
}

function TimelineItem({ item }: { item: TimelineItemDTO }) {
  const [expanded, setExpanded] = useState(false);

  const kindStyle = item.kind === "command"
    ? "bg-blue-100 text-blue-700"
    : "bg-green-100 text-green-700";

  const hasDetails = item.details && Object.keys(item.details).length > 0;

  return (
    <div className="py-2 space-y-1 text-sm">
      <div className="flex items-start gap-2 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${kindStyle}`}>
          {item.kind}
        </span>
        <span className="font-semibold text-slate-800">{item.title}</span>
        {item.status && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
            {item.status}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {new Date(item.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {item.summary && (
        <p className="text-xs text-slate-500 pl-1">{item.summary}</p>
      )}
      {item.error_message && (
        <p className="text-xs text-red-600 pl-1">{item.error_message}</p>
      )}
      {hasDetails && (
        <div className="pl-1">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            {expanded ? "Hide Details" : "Details"}
          </button>
          {expanded && (
            <pre className="mt-1 rounded-md bg-slate-50 border border-slate-200 p-2 text-xs text-slate-700 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(item.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ----- OperatorConsole -----

interface OperatorConsoleProps {
  session: SessionDetailDTO;
  onAssignDeviceCta: () => void;
}

function OperatorConsole({ session, onAssignDeviceCta }: OperatorConsoleProps) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [timelineType, setTimelineType] = useState<"all" | "command" | "event">("all");
  const [timelinePage, setTimelinePage] = useState(1);

  const isRunning = session.status === "running";
  const hasDevice = session.device_id !== null && session.device !== null;
  const canActOnDevice = hasDevice && isRunning;

  const { commands, isLoading: historyLoading, error: historyError } = useSessionCommandHistory(
    session.session_id,
    refreshTick,
  );

  const { events, isLoading: eventsLoading, error: eventsError } = useSessionEvents(
    session.session_id,
    refreshTick,
  );

  const {
    data: timelineItems,
    isLoading: timelineLoading,
    error: timelineError,
    pagination: timelinePagination,
  } = useSessionTimeline(session.session_id, timelineType, timelinePage, refreshTick);

  // Auto-poll every 10 s
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const patientName = session.patient
    ? `${session.patient.first_name} ${session.patient.last_name}`
    : null;

  const handleEndSessionClick = () => {
    if (confirmEnd) {
      return; // confirmation UI is shown — do nothing on label click
    }
    setConfirmEnd(true);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Operator Console</h3>

      {/* Device status panel */}
      <div className="space-y-2">
        {!hasDevice ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">No device assigned</p>
            <button
              type="button"
              onClick={onAssignDeviceCta}
              className="rounded-md px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Assign device
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-1 items-center text-sm">
            <span className="text-slate-700 font-medium">
              {session.device!.name}
              <span className="ml-2 text-slate-400 font-normal text-xs">({session.device!.serial_number})</span>
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isRunning ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {isRunning ? "Session running" : "Session ended"}
            </span>
            {patientName && (
              <span className="text-slate-500 text-xs">Patient: {patientName}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions panel — only when device assigned AND running */}
      {hasDevice && (
        <div className="space-y-3">
          {!isRunning && (
            <p className="text-sm text-slate-500 italic">Session is not active — actions disabled</p>
          )}
          <div className="flex flex-wrap gap-3">
            <ConsoleCommandButton
              label="Recenter View"
              disabled={!canActOnDevice}
              action={() => commandsApi.recenterView(session.device_id!, session.session_id)}
            />

            {/* End Session with inline confirmation */}
            <div className="flex flex-col gap-1">
              {!confirmEnd ? (
                <button
                  type="button"
                  disabled={!canActOnDevice}
                  onClick={handleEndSessionClick}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    !canActOnDevice
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  End Session
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Confirm end?</span>
                  <ConsoleCommandButton
                    label="Yes, end"
                    disabled={!canActOnDevice}
                    action={async () => {
                      const result = await commandsApi.endSession(session.device_id!, session.session_id);
                      setConfirmEnd(false);
                      return result;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmEnd(false)}
                    className="rounded-lg px-3 py-2 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled
              title="Not implemented in hardware"
              className="rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
            >
              Pause
            </button>

            <button
              type="button"
              disabled
              title="Not implemented in hardware"
              className="rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Command history panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Command History</h4>
          <button
            type="button"
            aria-label="Refresh command history"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : historyError ? (
          <p className="text-sm text-red-500">Failed to load command history</p>
        ) : commands.length === 0 ? (
          <p className="text-sm text-slate-400">No commands yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {commands.map((cmd) => (
              <div key={cmd.command_id} className="py-2 flex items-start gap-3 text-sm">
                <CommandStatusBadge status={cmd.status} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-slate-700">
                    {cmd.command_name.replace(/^command\./, "")}
                  </span>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Sent: {formatDate(cmd.sent_at)}
                  </div>
                  {cmd.error_message && (
                    <p className="text-xs text-red-600 mt-0.5">{cmd.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Events panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Session Events</h4>
          <button
            type="button"
            aria-label="Refresh session events"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Refresh
          </button>
        </div>

        {eventsLoading ? (
          <p className="text-sm text-slate-400">Loading events...</p>
        ) : eventsError ? (
          <p className="text-sm text-red-500">Failed to load events</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((evt) => {
              const summary = formatPayloadSummary(evt.payload);
              return (
                <div key={evt.event_id} className="py-2 flex items-start gap-3 text-sm">
                  <EventTypeBadge eventType={evt.event_type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(evt.occurred_at).toLocaleTimeString()}
                      {evt.device_id && (
                        <span className="ml-2 font-mono">{evt.device_id.slice(0, 8)}</span>
                      )}
                    </div>
                    {summary && (
                      <p className="text-xs text-slate-600 mt-0.5">{summary}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Timeline panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Session Timeline</h4>
          <button
            type="button"
            aria-label="Refresh timeline"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1">
          {(["all", "command", "event"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTimelineType(t);
                setTimelinePage(1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                timelineType === t
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t === "all" ? "All" : t === "command" ? "Commands" : "Events"}
            </button>
          ))}
        </div>

        {timelineLoading ? (
          <p className="text-sm text-slate-400">Loading timeline...</p>
        ) : timelineError ? (
          <p className="text-sm text-red-500">Failed to load timeline</p>
        ) : timelineItems.length === 0 ? (
          <p className="text-sm text-slate-400">No timeline entries yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {timelineItems.map((item) => (
              <TimelineItem key={item.timeline_id} item={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {timelinePagination && timelinePagination.totalPages > 1 && (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
              disabled={timelinePage <= 1}
              className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &larr; Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {timelinePagination.page} of {timelinePagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setTimelinePage((p) => Math.min(timelinePagination.totalPages, p + 1))}
              disabled={timelinePage >= timelinePagination.totalPages}
              className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Session Action Bar -----

interface SessionActionBarProps {
  session: SessionDetailDTO;
  onSessionUpdated: (updated: SessionDetailDTO) => void;
}

function SessionActionBar({ session, onSessionUpdated }: SessionActionBarProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const isPending = session.status === "pending";
  const isRunning = session.status === "running";

  if (!isPending && !isRunning) return null;

  const handleStart = async () => {
    setIsStarting(true);
    setActionError(null);
    try {
      await sessionsApi.start(session.session_id);
      // Re-fetch full session: start response returns SessionDTO without expanded
      // patient/variant fields, causing "Unknown" in the header. getById returns
      // the complete SessionDetailDTO with all expanded relations.
      const updated = await sessionsApi.getById(session.session_id);
      onSessionUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        const messages: Record<string, string> = {
          PATIENT_INACTIVE: "El paciente asignado está dado de baja. Actívalo antes de iniciar la sesión.",
          VARIANT_INACTIVE: "La variante asignada está inactiva. Contacta al administrador.",
          MODULE_INACTIVE: "El módulo de la variante está inactivo. Contacta al administrador.",
          INVALID_CONFIG: `Configuración inválida: ${err.message}`,
          DEVICE_INACTIVE: "El dispositivo asignado está inactivo o fue dado de baja.",
          DEVICE_ALREADY_IN_USE: "El dispositivo ya está en uso en otra sesión activa.",
          REDIS_UNAVAILABLE: "El servidor de tiempo real no está disponible. Inténtalo de nuevo.",
          INVALID_SESSION_TRANSITION: "Esta sesión no se puede iniciar en su estado actual.",
        };
        setActionError(messages[err.code] ?? err.message);
      } else {
        setActionError("Error al iniciar la sesión. Verifica la conexión.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    setActionError(null);
    try {
      await sessionsApi.complete(session.session_id);
      // Re-fetch full session with expanded patient/variant fields.
      const updated = await sessionsApi.getById(session.session_id);
      onSessionUpdated(updated);
      setConfirmComplete(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to complete session");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    setActionError(null);
    try {
      await sessionsApi.cancel(session.session_id);
      // Re-fetch full session with expanded patient/variant fields.
      const updated = await sessionsApi.getById(session.session_id);
      onSessionUpdated(updated);
      setConfirmCancel(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel session");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Session Actions</h3>

      <div className="flex flex-wrap gap-3">
        {isPending && (
          <button
            type="button"
            onClick={() => { void handleStart(); }}
            disabled={isStarting}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isStarting
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-700"
            }`}
          >
            {isStarting ? "Iniciando..." : "Iniciar sesión"}
          </button>
        )}

        {isRunning && (
          !confirmComplete ? (
            <button
              type="button"
              onClick={() => setConfirmComplete(true)}
              disabled={isCompleting}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar sesión
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">¿Confirmar finalización?</span>
              <button
                type="button"
                onClick={() => { void handleComplete(); }}
                disabled={isCompleting}
                className="rounded-lg px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isCompleting ? "Finalizando..." : "Sí, finalizar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmComplete(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                No
              </button>
            </div>
          )
        )}

        {!confirmCancel ? (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={isCancelling}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-white border border-red-300 text-red-600 hover:bg-red-50"
          >
            Cancelar sesión
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">¿Confirmar cancelación?</span>
            <button
              type="button"
              onClick={() => { void handleCancel(); }}
              disabled={isCancelling}
              className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isCancelling ? "Cancelando..." : "Sí, cancelar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              No
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <p className="text-sm text-red-600" role="alert">{actionError}</p>
      )}
    </div>
  );
}

// ----- Device Assignment Section -----

interface DeviceAssignmentSectionProps {
  session: SessionDetailDTO;
  onSessionUpdated: (updated: SessionDetailDTO) => void;
  autoFocus?: boolean;
}

function DeviceAssignmentSection({ session, onSessionUpdated }: DeviceAssignmentSectionProps) {
  const { devices, isLoading: devicesLoading } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showChangeSelector, setShowChangeSelector] = useState(false);

  const activeDevices = devices.filter((d) => d.active);

  const handleAssign = async () => {
    const deviceId = selectedDeviceId;
    if (!deviceId) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      const updated = await sessionsApi.assignDevice(session.session_id, deviceId);
      onSessionUpdated(updated);
      setSelectedDeviceId("");
      setShowChangeSelector(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === "DEVICE_INACTIVE") {
          setAssignError("This device is inactive and cannot be assigned");
        } else if (err.status === 409 && err.code === "SESSION_NOT_ACTIVE") {
          setAssignError("This session is no longer active");
        } else if (err.status === 404) {
          setAssignError("Device not found");
        } else {
          setAssignError(err.message);
        }
      } else {
        setAssignError(err instanceof Error ? err.message : "Assignment failed");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const hasDevice = session.device !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Device Assignment</h3>

      {hasDevice && !showChangeSelector ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-800">
            Device: <span className="font-medium">{session.device!.name}</span>{" "}
            <span className="text-slate-500">({session.device!.serial_number})</span>
          </span>
          <button
            type="button"
            aria-label="Change device"
            onClick={() => {
              setShowChangeSelector(true);
              setAssignError(null);
            }}
            className="rounded-md px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Change
          </button>
        </div>
      ) : null}

      {!hasDevice && (
        <p className="text-sm text-slate-500">No device assigned</p>
      )}

      {(!hasDevice || showChangeSelector) && (
        <div className="flex items-center gap-3 flex-wrap">
          {devicesLoading ? (
            <p className="text-sm text-slate-400">Loading devices…</p>
          ) : activeDevices.length === 0 ? (
            <p className="text-sm text-slate-400">No active devices available</p>
          ) : (
            <select
              aria-label="Select device"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select a device…</option>
              {activeDevices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_name} ({d.serial_number})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            aria-label="Assign device"
            onClick={() => { void handleAssign(); }}
            disabled={!selectedDeviceId || isAssigning}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              !selectedDeviceId || isAssigning
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-700"
            }`}
          >
            {isAssigning ? "Assigning…" : "Assign"}
          </button>
          {showChangeSelector && (
            <button
              type="button"
              onClick={() => {
                setShowChangeSelector(false);
                setAssignError(null);
                setSelectedDeviceId("");
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {assignError && (
        <p className="text-sm text-red-600" role="alert">{assignError}</p>
      )}
    </div>
  );
}

// ----- Main page -----

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";

  const { session: initialSession, isLoading, error, reload } = useSession(sessionId);
  const { user } = useAuth();
  const [sessionOverride, setSessionOverride] = useState<SessionDetailDTO | null>(null);
  const [scrollToAssign, setScrollToAssign] = useState(false);

  const session = sessionOverride ?? initialSession;

  const canManageDevice =
    user?.role === "admin" || user?.role === "therapist";

  const canSeeConsole =
    user?.role === "admin" || user?.role === "therapist";

  const canSeeSummary =
    user?.role === "admin" || user?.role === "therapist";

  const canSeeReport =
    user?.role === "admin" || user?.role === "therapist";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-800">
            &larr; Sessions
          </Link>
        </div>
        <p className="text-sm text-slate-500">Loading session...</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="space-y-4">
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-800">
          &larr; Sessions
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">Session not valid</p>
          <p className="mt-1 text-sm text-amber-700">Your session has expired. Please log in again.</p>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-4">
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-800">
          &larr; Sessions
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Access denied</p>
          <p className="mt-1 text-sm text-red-700">You do not have permission to view this session.</p>
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-4">
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-800">
          &larr; Sessions
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Session not found</p>
          <p className="mt-1 text-sm text-slate-600">The session with ID {sessionId} does not exist.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-800">
          &larr; Sessions
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-medium text-slate-800">Error loading session</p>
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

  if (!session) return null;

  const patientName =
    session.patient
      ? `${session.patient.first_name} ${session.patient.last_name}`
      : "Unknown";

  const duration = durationMinutes(session.started_at, session.ended_at);
  const hasMetrics =
    session.metrics && Object.keys(session.metrics).length > 0;
  const hasAnyMetricValues =
    session.score_value !== null ||
    session.pain_before !== null ||
    session.pain_after !== null ||
    session.difficulty !== null ||
    hasMetrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/sessions"
          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          &larr; Sessions
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-900">
          Session {session.session_id.slice(0, 8)}...
        </h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[session.status]}`}
        >
          {session.status}
        </span>
        {session.patient_id && (
          <Link
            href={`/patients/${session.patient_id}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Ver paciente
          </Link>
        )}
        {canSeeReport && (
          <Link
            href={`/sessions/${session.session_id}/report`}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            View Report
          </Link>
        )}
      </div>

      {/* Main info card */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 divide-y divide-slate-100">
        <InfoRow label="Patient" value={patientName} />
        {session.therapist_id && (
          <InfoRow
            label="Therapist ID"
            value={
              <span className="font-mono text-xs">{session.therapist_id}</span>
            }
          />
        )}
        {session.device && (
          <InfoRow label="Device" value={session.device.name} />
        )}
        <InfoRow
          label="Module (variant)"
          value={
            session.variant
              ? `${session.variant.name} (${session.variant.variant_code})`
              : <span className="font-mono text-xs">{session.variant_id}</span>
          }
        />
        <InfoRow
          label="Started"
          value={formatDate(session.started_at ?? undefined)}
        />
        <InfoRow
          label="Ended"
          value={formatDate(session.ended_at ?? undefined)}
        />
        {duration && <InfoRow label="Duration" value={duration} />}
      </div>

      {/* Session Summary panel — admin and therapist only */}
      {canSeeSummary && (
        <SessionSummaryPanel sessionId={session.session_id} />
      )}

      {/* Session Actions — admin and therapist only, pending or running */}
      {canManageDevice && (
        <SessionActionBar
          session={session}
          onSessionUpdated={(updated) => setSessionOverride(updated)}
        />
      )}

      {/* Device Assignment section — admin and therapist only */}
      {canManageDevice && (
        <div id="device-assignment-section">
          <DeviceAssignmentSection
            session={session}
            onSessionUpdated={(updated) => {
              setSessionOverride(updated);
              setScrollToAssign(false);
            }}
            autoFocus={scrollToAssign}
          />
        </div>
      )}

      {/* Operator Console — admin and therapist only */}
      {canSeeConsole && (
        <OperatorConsole
          session={session}
          onAssignDeviceCta={() => {
            setScrollToAssign(true);
            const el = document.getElementById("device-assignment-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {/* Metrics card */}
      {hasAnyMetricValues && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Metrics</h3>
          <div className="divide-y divide-slate-100">
            {session.score_value !== null && (
              <InfoRow label="Score" value={session.score_value} />
            )}
            {session.pain_before !== null && (
              <InfoRow label="Pain before" value={session.pain_before} />
            )}
            {session.pain_after !== null && (
              <InfoRow label="Pain after" value={session.pain_after} />
            )}
            {session.difficulty !== null && (
              <InfoRow label="Difficulty" value={session.difficulty} />
            )}
            <InfoRow
              label="Completed"
              value={
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.completed
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {session.completed ? "Yes" : "No"}
                </span>
              }
            />
          </div>

          {hasMetrics && (
            <div className="pt-2">
              <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Additional metrics
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                        Key
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(session.metrics).map(([key, val]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                          {key}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">
                          {JSON.stringify(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
