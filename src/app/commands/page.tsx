"use client";

import { useState } from "react";
import { CommandForm } from "@/components/forms/command-form";
import { JsonViewer } from "@/components/debug/json-viewer";
import { sendCommand } from "@/features/commands/command-api";
import type { CommandPayload } from "@/features/commands/command-schemas";
import { useRealtimeEvents } from "@/features/realtime/use-realtime-events";

export default function CommandsPage() {
  const [lastResponse, setLastResponse] = useState<unknown>();
  const [sendError, setSendError] = useState<string>();
  const { events } = useRealtimeEvents();

  async function handleSend(payload: CommandPayload) {
    setSendError(undefined);
    try {
      const response = await sendCommand(payload);
      setLastResponse(response);
    } catch (error) {
      setLastResponse(undefined);
      setSendError(error instanceof Error ? error.message : JSON.stringify(error));
    }
  }

  const commandEvents = events.filter((event) => event.eventType.startsWith("command."));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Command Test Panel</h2>
      <section className="rounded border border-slate-200 bg-white p-4">
        <CommandForm onSend={handleSend} />
      </section>
      {sendError ? <p className="text-sm text-red-700">{sendError}</p> : null}
      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium">Last command response</h3>
        <JsonViewer data={lastResponse ?? { status: "No command sent yet" }} />
      </section>
      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium">Command ACK log</h3>
        <JsonViewer data={commandEvents.slice(0, 20)} />
      </section>
    </div>
  );
}
