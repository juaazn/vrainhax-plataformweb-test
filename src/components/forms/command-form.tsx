"use client";

import { useState } from "react";
import { commandSchema, type CommandPayload } from "@/features/commands/command-schemas";
import { safeJsonParse, safeStringify } from "@/lib/safe-json";

const defaultCommand: CommandPayload = {
  type: "command.start_session",
  device_id: "aaaaaaaa-0000-4000-8000-000000000001",
};

export function CommandForm({ onSend }: { onSend: (payload: CommandPayload) => Promise<void> }) {
  const [value, setValue] = useState(safeStringify(defaultCommand));
  const [error, setError] = useState<string>();

  async function submit() {
    setError(undefined);
    try {
      const parsed = safeJsonParse(value);
      const result = commandSchema.safeParse(parsed);
      if (!result.success) {
        setError(result.error.issues.map((issue) => issue.message).join(", "));
        return;
      }
      await onSend(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }

  return (
    <div className="space-y-3">
      <textarea className="h-44 w-full rounded border border-slate-300 p-2 font-mono text-xs" value={value} onChange={(e) => setValue(e.target.value)} />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" onClick={submit} type="button">Send command</button>
    </div>
  );
}
