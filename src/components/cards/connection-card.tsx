export function ConnectionCard({ title, value, children }: { title: string; value: string; children?: React.ReactNode }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {children ? <div className="mt-2 text-xs text-slate-600">{children}</div> : null}
    </article>
  );
}
