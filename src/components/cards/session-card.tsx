import type { SessionItem } from "@/features/sessions/session-types";
import { StatusBadge } from "@/components/debug/status-badge";

export function SessionCard({ session }: { session: SessionItem }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="font-medium">{session.sessionId}</div>
      <div className="mt-2"><StatusBadge value={session.status} /></div>
      <div className="mt-2 text-slate-600">Patient: {session.patientId}</div>
    </article>
  );
}
