"use client";

import { useQuery } from "@tanstack/react-query";
import { JsonViewer } from "@/components/debug/json-viewer";
import { getHealth, getReady } from "@/features/api/endpoints";

export default function StatusPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const ready = useQuery({ queryKey: ["ready"], queryFn: getReady });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Backend Status</h2>
      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium">GET /health</h3>
        <div className="mb-2 text-sm text-slate-600">Status: {health.data?.status ?? "-"} | Time: {Math.round(health.data?.responseTimeMs ?? 0)}ms</div>
        <JsonViewer data={health.error ?? health.data?.data ?? { loading: health.isLoading }} />
      </section>
      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium">GET /ready</h3>
        <div className="mb-2 text-sm text-slate-600">Status: {ready.data?.status ?? "-"} | Time: {Math.round(ready.data?.responseTimeMs ?? 0)}ms</div>
        <JsonViewer data={ready.error ?? ready.data?.data ?? { loading: ready.isLoading }} />
      </section>
    </div>
  );
}
