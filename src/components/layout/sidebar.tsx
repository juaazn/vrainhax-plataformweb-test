"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { cn } from "@/lib/cn";

interface NavLink {
  href: string;
  label: string;
  roles?: string[];
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/patients", label: "Pacientes", roles: ["admin", "therapist"] },
  { href: "/sessions/new", label: "Nueva sesión", roles: ["admin", "therapist"] },
  { href: "/sessions", label: "Sesiones" },
  { href: "/devices", label: "Dispositivos", roles: ["admin", "therapist"] },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/sessions/new") return pathname === "/sessions/new";
  // Prevent /sessions/new from also activating /sessions via prefix match
  if (pathname === "/sessions/new") return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? "patient";

  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.roles || link.roles.includes(role),
  );

  return (
    <aside className="w-full border-r border-slate-200 bg-white p-4 md:w-56">
      <p className="mb-5 text-base font-bold tracking-tight text-slate-900">
        VRAINHAX
      </p>
      <nav className="space-y-1" aria-label="Navegación principal">
        {visibleLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium",
              isActive(pathname, href)
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
