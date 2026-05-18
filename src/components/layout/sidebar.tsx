"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  ["/", "Dashboard"],
  ["/status", "Status"],
  ["/devices", "Devices"],
  ["/patients", "Patients"],
  ["/sessions", "Sessions"],
  ["/sessions/new", "Nueva Sesion"],
  ["/commands", "Commands"],
  ["/metrics", "Metrics"],
  ["/sandbox", "Sandbox"],
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-r border-slate-200 bg-white p-4 md:w-64">
      <h1 className="mb-4 text-lg font-semibold">VRAINHAX Test</h1>
      <nav className="space-y-2">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm",
              pathname === href ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
