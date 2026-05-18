"use client";

export function PayloadEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <textarea
      className="h-56 w-full rounded border border-slate-300 p-2 font-mono text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
