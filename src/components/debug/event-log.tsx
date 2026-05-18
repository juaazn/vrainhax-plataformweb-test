import { formatDate } from "@/lib/format-date";
import type { RealtimeEvent } from "@/features/realtime/realtime-types";
import { JsonViewer } from "@/components/debug/json-viewer";

export function EventLog({ events }: { events: RealtimeEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map((event, idx) => (
        <div key={`${event.eventType}-${idx}`} className="rounded border border-slate-200 bg-white p-3 text-xs">
          <div className="mb-1 font-mono font-bold">{event.eventType}</div>
          <div className="mb-2 text-slate-500">{formatDate(event.occurredAt)}</div>
          <JsonViewer data={event._known ? event.summary : event.rawPayload} />
        </div>
      ))}
    </div>
  );
}
