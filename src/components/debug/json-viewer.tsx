import { safeStringify } from "@/lib/safe-json";

export function JsonViewer({ data }: { data: unknown }) {
  return <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{safeStringify(data)}</pre>;
}
