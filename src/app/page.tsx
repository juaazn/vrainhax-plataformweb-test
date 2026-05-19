"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";

function QuickCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "patient";
  const isClinical = role === "admin" || role === "therapist";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Inicio</h2>
        <p className="mt-1 text-sm text-slate-500">
          Plataforma de rehabilitación con realidad virtual VRAINHAX.
        </p>
      </div>

      {isClinical && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickCard href="/patients" title="Pacientes" description="Ver y gestionar fichas clínicas." />
          <QuickCard href="/sessions/new" title="Nueva sesión" description="Crear una sesión de rehabilitación configurada." />
          <QuickCard href="/sessions" title="Sesiones" description="Ver el historial y el estado de todas las sesiones." />
          <QuickCard href="/devices" title="Dispositivos" description="Estado de los visores VR y gestión de credenciales." />
        </div>
      )}

      {role === "patient" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickCard href="/sessions" title="Mis sesiones" description="Ver tus sesiones de rehabilitación." />
        </div>
      )}
    </div>
  );
}
