"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, ApiError } from "@/lib/api";
import { env } from "@/lib/env";
import type { RoleCode } from "@/types/roles";

/**
 * AuthProvider — Modelo B: sesión propia del backend (cookie httpOnly).
 *
 * Flujo de refreshAuth:
 *   1. GET /api/v1/auth/me  con credentials:'include' (sin Bearer).
 *      → 200: sesión backend vigente, usuario autenticado.
 *      → 401: no hay sesión backend → intentar bootstrap.
 *   2. Bootstrap: GET /api/auth/id-token (Route Handler servidor Next.js).
 *      → Sin idToken: no hay sesión Auth0 → "unauthenticated".
 *      → Con idToken: POST /api/v1/auth/session credentials:'include'.
 *   3. Si POST /session → 200: reintentar GET /auth/me → "authenticated".
 *      Si POST /session → 403: usuario no existe o inactivo en PostgreSQL → "unauthenticated".
 */

export type AuthUser = {
  userId?: string;
  username?: string;
  email?: string;
  role?: RoleCode;
  active?: boolean;
};

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "profile_incomplete"
  | "authenticated"
  | "error";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  isLoading: boolean;
  error?: string;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── helpers internos ───────────────────────────────────────────────────────────

/** Lee el ID Token de la sesión servidor de Auth0 (no expuesto al cliente por el SDK). */
async function fetchIdTokenFromServer(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/id-token");
    if (!res.ok) return null;
    const data = (await res.json()) as { idToken?: string };
    return data.idToken ?? null;
  } catch {
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | undefined>();

  const refreshAuth = useCallback(async () => {
    try {
      setStatus("loading");

      // ── Paso 1: intentar con sesión backend existente (cookie httpOnly) ──
      // apiClient ya envía credentials:'include' y nunca añade Authorization:Bearer
      try {
        const me = await apiClient.get<AuthUser>("/api/v1/auth/me");
        setUser(me);
        setError(undefined);
        setStatus("authenticated");
        return;
      } catch (err) {
        // Sólo avanzamos al bootstrap si la sesión no existe (401).
        // Cualquier otro error (red, 5xx) se propaga.
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
      }

      // ── Paso 2: guard post-logout ──
      // Si el usuario acaba de hacer logout, Auth0 redirige a /login?logged_out=1.
      // Saltamos el bootstrap para evitar que se recree inmediatamente la sesión
      // backend usando un idToken residual de Auth0.
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("logged_out") === "1") {
          setUser(null);
          setError(undefined);
          setStatus("unauthenticated");
          return;
        }
      }

      // ── Paso 3: no hay sesión backend — intentar bootstrap con Auth0 ──
      const idToken = await fetchIdTokenFromServer();

      if (!idToken) {
        // Sin sesión Auth0 activa — el usuario no ha hecho login
        setUser(null);
        setError(undefined);
        setStatus("unauthenticated");
        return;
      }

      // ── Paso 4: crear sesión backend con el ID token ──
      // apiClient.post envía credentials:'include' → el backend devuelve Set-Cookie
      try {
        await apiClient.post("/api/v1/auth/session", { idToken });
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 403) {
            // Auth0 OK pero usuario inactivo o no existe en PostgreSQL
            setUser(null);
            setError(undefined);
            setStatus("unauthenticated");
            return;
          }
          if (err.status === 409) {
            // Conflicto de vinculación de cuentas
            setUser(null);
            setError("Account linking conflict. Contact support.");
            setStatus("error");
            return;
          }
        }
        throw err;
      }

      // ── Paso 4: sesión creada — obtener perfil con la cookie recién emitida ──
      const me = await apiClient.get<AuthUser>("/api/v1/auth/me");
      setUser(me);
      setError(undefined);
      setStatus("authenticated");
    } catch (err: unknown) {
      setUser(null);
      setError(err instanceof ApiError ? err.message : "Authentication failed");
      setStatus("error");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Usar fetch directo (no apiClient) por dos razones:
      //   1. keepalive: true garantiza que el request llegue al backend aunque el
      //      navegador inicie la navegación antes de recibir la respuesta.
      //   2. El backend devuelve 204 No Content; no necesitamos parsear el body.
      //      apiClient.post() lanzaría SyntaxError al intentar res.json() en 204.
      await fetch(`${env.apiBaseUrl}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
      });
    } catch {
      // Error de red o backend no disponible — continuar con logout de Auth0 igualmente.
    } finally {
      setUser(null);
      setError(undefined);
      setStatus("unauthenticated");
      // returnTo debe ser una URL ABSOLUTA registrada en Auth0 > Allowed Logout URLs.
      // Auth0 OIDC logout rechaza URLs relativas con 400 Bad Request.
      // window.location.origin resuelve automáticamente según el entorno
      // (http://localhost:3000 en dev, https://app.vrainhax.com en prod).
      //
      // /login?logged_out=1 sirve para dos cosas:
      //   1. Evita que la página raíz dispare refreshAuth y recree la sesión backend.
      //   2. refreshAuth detecta logged_out=1 y omite el bootstrap de Auth0.
      const returnTo = `${window.location.origin}/login?logged_out=1`;
      window.location.href = "/api/auth/logout?returnTo=" + encodeURIComponent(returnTo);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshAuth();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isLoading: status === "loading",
      error,
      refreshAuth,
      logout,
    }),
    [error, logout, refreshAuth, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within AuthProvider");
  return context;
}
