"use client";

import { JsonViewer } from "@/components/debug/json-viewer";
import { useRealtimeEvents } from "@/features/realtime/use-realtime-events";

export default function MetricsPage() {
  const { events } = useRealtimeEvents("session.metric.received");
  const lastMetric = events[0];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Metrics Viewer</h2>
      <div className="rounded border border-slate-200 bg-white p-4 text-sm">Metric count: {events.length}</div>
      <div className="overflow-auto rounded border border-slate-200 bg-white p-4">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2">Event</th>
              <th className="py-2">Timestamp</th>
              <th className="py-2">Session</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 20).map((event, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2">{event.eventType}</td>
                <td className="py-2">{event.occurredAt ?? "-"}</td>
                <td className="py-2">{String((event._known ? event.summary : event.rawPayload as Record<string, unknown>)?.session_id ?? "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <JsonViewer data={lastMetric ?? { message: "No metrics received yet" }} />
    </div>
  );
}
