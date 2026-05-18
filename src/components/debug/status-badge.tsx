import { cn } from "@/lib/cn";

export function StatusBadge({ value }: { value: string }) {
  const isGood = ["connected", "ok", "ready", "success"].includes(value.toLowerCase());
  const isWarn = ["connecting", "pending"].includes(value.toLowerCase());

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
        isGood && "bg-green-100 text-green-700",
        isWarn && "bg-yellow-100 text-yellow-800",
        !isGood && !isWarn && "bg-red-100 text-red-700",
      )}
    >
      {value}
    </span>
  );
}
