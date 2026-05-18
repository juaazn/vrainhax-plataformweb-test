"use client";

import { useState } from "react";
import { useModules } from "@/lib/hooks/use-modules";
import { useVariantSchema } from "@/lib/hooks/use-variant-schema";
import { SessionActivateForm } from "@/components/forms/SessionActivateForm";
import type { VariantSummaryDTO, SessionDTO } from "@/types/api";

function VariantDetail({
  variantId,
  onCancel,
}: {
  variantId: string;
  onCancel: () => void;
}) {
  const { schema, isLoading, error } = useVariantSchema(variantId);
  const [createdSession, setCreatedSession] = useState<SessionDTO | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading variant schema...</p>;
  if (error) return <p className="text-sm text-red-600">Error: {error.message}</p>;
  if (!schema) return null;

  if (createdSession) {
    return (
      <div className="mt-4 space-y-3 border-t pt-4">
        <div className="rounded bg-green-50 p-4">
          <p className="mb-2 font-semibold text-green-800">Sesion creada</p>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 font-medium text-slate-700">ID:</dt>
              <dd className="font-mono text-slate-900">{createdSession.session_id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 font-medium text-slate-700">Estado:</dt>
              <dd className="text-slate-900">{createdSession.status}</dd>
            </div>
          </dl>
          <pre className="mt-3 overflow-x-auto rounded bg-green-100 p-3 text-xs text-green-900">
            {JSON.stringify(createdSession.config, null, 2)}
          </pre>
        </div>
        <button
          type="button"
          onClick={() => setCreatedSession(null)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Nueva sesion
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {/* Session activate form */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">Activar sesion</h4>
        <div className="rounded border bg-slate-50 p-4">
          <SessionActivateForm
            variantId={variantId}
            configSchema={schema.config_schema}
            onSuccess={(session) => setCreatedSession(session)}
            onCancel={onCancel}
          />
        </div>
      </div>

      {/* Raw schema debug view — collapsible */}
      <details className="rounded border">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Schema crudo (config, metrics, commands)
        </summary>
        <div className="space-y-4 px-3 pb-4 pt-2">
          <div>
            <h4 className="mb-1 text-sm font-semibold">config_schema (raw)</h4>
            <pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs">
              {JSON.stringify(schema.config_schema, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold">metrics_schema</h4>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-100">
                  <th className="px-2 py-1">key</th>
                  <th className="px-2 py-1">label</th>
                  <th className="px-2 py-1">type</th>
                  <th className="px-2 py-1">unit</th>
                </tr>
              </thead>
              <tbody>
                {schema.metrics_schema.map((m) => (
                  <tr key={m.key} className="border-b">
                    <td className="px-2 py-1 font-mono">{m.key}</td>
                    <td className="px-2 py-1">{m.label}</td>
                    <td className="px-2 py-1">{m.type}</td>
                    <td className="px-2 py-1">{m.unit ?? "—"}</td>
                  </tr>
                ))}
                {schema.metrics_schema.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-1 text-slate-400">
                      No metrics defined
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold">commands</h4>
            <ul className="space-y-1 text-xs">
              {schema.commands.map((cmd) => (
                <li key={cmd.variant_command_id} className="flex gap-3 rounded bg-slate-50 px-2 py-1">
                  <span className="font-mono text-blue-700">{cmd.command_name}</span>
                  <span className="text-slate-600">{cmd.label}</span>
                </li>
              ))}
              {schema.commands.length === 0 && (
                <li className="text-slate-400">No commands defined</li>
              )}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}

export default function ModulesTestPage() {
  const { modules, isLoading, error } = useModules();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  if (isLoading) return <p className="p-6 text-slate-500">Loading modules...</p>;
  if (error) return <p className="p-6 text-red-600">Error loading modules: {error.message}</p>;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold">Modules &amp; Variants Test Panel</h2>

      {modules.length === 0 && (
        <p className="text-slate-400">No modules returned from API.</p>
      )}

      {modules.map((mod) => (
        <div key={mod.module_id} className="rounded border bg-white p-4 shadow-sm">
          <div className="flex items-baseline gap-3">
            <h3 className="font-medium">{mod.name}</h3>
            <span className="font-mono text-xs text-slate-500">{mod.module_code}</span>
            {!mod.active && (
              <span className="rounded bg-yellow-100 px-1 text-xs text-yellow-700">inactive</span>
            )}
          </div>
          {mod.description && (
            <p className="mt-1 text-sm text-slate-500">{mod.description}</p>
          )}

          {mod.variants && mod.variants.length > 0 && (
            <ul className="mt-3 space-y-1">
              {mod.variants.map((v: VariantSummaryDTO) => (
                <li key={v.variant_id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedVariantId(
                        selectedVariantId === v.variant_id ? null : v.variant_id,
                      )
                    }
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                  >
                    <span
                      className={`text-xs ${selectedVariantId === v.variant_id ? "text-blue-700 font-semibold" : "text-slate-700"}`}
                    >
                      {v.name}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{v.variant_code}</span>
                    {!v.active && (
                      <span className="rounded bg-yellow-100 px-1 text-xs text-yellow-700">
                        inactive
                      </span>
                    )}
                  </button>

                  {selectedVariantId === v.variant_id && (
                    <div className="ml-3 rounded border-l-2 border-blue-200 pl-3">
                      <VariantDetail
                        variantId={v.variant_id}
                        onCancel={() => setSelectedVariantId(null)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {(!mod.variants || mod.variants.length === 0) && (
            <p className="mt-2 text-xs text-slate-400">No variants nested in this response.</p>
          )}
        </div>
      ))}
    </div>
  );
}
