"use client";

import { useState } from "react";
import { PayloadEditor } from "@/components/forms/payload-editor";
import { JsonViewer } from "@/components/debug/json-viewer";
import { metricSchema } from "@/features/metrics/metric-schemas";
import { safeStringify, safeJsonParse } from "@/lib/safe-json";

const samplePayload = {
  session_id: "test-session-001",
  game_id: "SHOULDER_GAMES",
  timestamp: new Date().toISOString(),
  metric: { score: 10, rep: 1 },
};

export default function SandboxPage() {
  const [value, setValue] = useState<string>(safeStringify(samplePayload));
  const [result, setResult] = useState<unknown>({ status: "Not validated yet" });

  function validate() {
    try {
      const parsed = safeJsonParse(value);
      const check = metricSchema.safeParse(parsed);
      setResult(check.success ? { valid: true, data: check.data } : { valid: false, issues: check.error.issues });
    } catch (error) {
      setResult({ valid: false, error: error instanceof Error ? error.message : "Invalid JSON" });
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Unity Payload Sandbox</h2>
      <PayloadEditor value={value} onChange={setValue} />
      <div className="flex gap-2">
        <button type="button" onClick={validate} className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Validate</button>
        <button type="button" disabled className="rounded bg-slate-300 px-4 py-2 text-sm text-slate-600">Send to backend (disabled until endpoint exists)</button>
      </div>
      <JsonViewer data={result} />
    </div>
  );
}
