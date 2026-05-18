"use client";

import { useAuth } from "@/features/auth/use-auth";
import { AUTH_LOGIN_HREF, AUTH_REGISTER_HREF } from "@/features/auth/auth-routes";
import { env } from "@/lib/env";

export function Topbar() {
  const { status, user, error, logout } = useAuth();
  const userLabel = user?.username ?? user?.email ?? "Authenticated session";

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-700">
          <span className="font-medium text-slate-900">Environment:</span> {env.appEnv}
          <span className="mx-2 hidden text-slate-300 md:inline">|</span>
          <span className="font-medium text-slate-900">API:</span> {env.apiBaseUrl}
        </div>

        <div className="flex items-center justify-end gap-3 text-sm">
          {status === "unauthenticated" && (
            <>
              <a
                href={AUTH_LOGIN_HREF}
                className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Login
              </a>
              <a
                href={AUTH_REGISTER_HREF}
                className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
              >
                Register
              </a>
            </>
          )}

          {status === "profile_incomplete" && (
            <>
              <span className="rounded-full bg-amber-50 px-3 py-2 font-medium text-amber-700">Profile setup</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          )}

          {status === "authenticated" && (
            <>
              <span className="rounded-full bg-emerald-50 px-3 py-2 font-medium text-emerald-700">{userLabel}</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          )}

          {status === "error" && error && (
            <span className="rounded-full bg-rose-50 px-3 py-2 font-medium text-rose-700">{error}</span>
          )}
        </div>
      </div>
    </header>
  );
}
