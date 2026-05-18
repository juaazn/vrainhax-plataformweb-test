import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuthContext } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api";

/**
 * Tests del AuthProvider — Modelo B: sesión propia del backend (cookie httpOnly).
 *
 * Flujo que se prueba:
 *   1. GET /api/v1/auth/me (apiClient, credentials:include)
 *      → 200: sesión vigente → "authenticated"
 *      → 401: sin sesión → bootstrap
 *   2. GET /api/auth/id-token (fetch interno a Next.js)
 *      → sin idToken: no hay sesión Auth0 → "unauthenticated"
 *      → con idToken: POST /api/v1/auth/session
 *   3. POST /api/v1/auth/session (apiClient, credentials:include)
 *      → 200: reintentar GET /auth/me → "authenticated"
 *      → 403: usuario no en PostgreSQL → "unauthenticated"
 *      → 409: conflicto de vinculación → "error"
 */

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api", async () => {
  // Importamos el módulo real para que ApiError sea la clase auténtica
  // (instanceof ApiError funciona correctamente dentro del provider)
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiClient: {
      get: (...args: unknown[]) => mockGet(...args),
      post: (...args: unknown[]) => mockPost(...args),
    },
  };
});

const mockFetch = vi.fn();

const MOCK_USER = {
  userId: "8f7773fe-cf0d-4f2d-a3c3-f7790efe1d66",
  username: "ana",
  email: "ana@example.com",
  role: "therapist",
  active: true,
};

function noSession() {
  return new ApiError(401, "UNAUTHORIZED", "Missing session cookie");
}

function idTokenResponse(idToken: string | null) {
  return {
    ok: idToken !== null,
    json: async () =>
      idToken !== null ? { idToken, sub: "auth0|test" } : { error: "NO_SESSION" },
  };
}

describe("AuthProvider — Modelo B (cookie httpOnly)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Caso 1: sesión backend vigente ─────────────────────────────────────────

  it("authenticated when backend session cookie already exists", async () => {
    mockGet.mockResolvedValueOnce(MOCK_USER);

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("ana@example.com");
    // No debe llamar a /api/auth/id-token ni a POST /auth/session
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  // ── Caso 2: sin sesión backend, sin sesión Auth0 ───────────────────────────

  it("unauthenticated when no backend session and no Auth0 session", async () => {
    mockGet.mockRejectedValueOnce(noSession());
    mockFetch.mockResolvedValueOnce(idTokenResponse(null));

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.user).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });

  // ── Caso 3: sin sesión backend, con Auth0 → bootstrap exitoso ─────────────

  it("bootstraps backend session when Auth0 session exists", async () => {
    mockGet
      .mockRejectedValueOnce(noSession())         // primera llamada: sin cookie
      .mockResolvedValueOnce(MOCK_USER);           // segunda llamada: tras crear sesión
    mockFetch.mockResolvedValueOnce(idTokenResponse("<id_token>"));
    mockPost.mockResolvedValueOnce(MOCK_USER);     // POST /auth/session → 200

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("ana@example.com");
    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/session", { idToken: "<id_token>" });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  // ── Caso 4: Auth0 OK, usuario no existe en PostgreSQL (403) ───────────────

  it("unauthenticated when user not found in PostgreSQL (403 from /auth/session)", async () => {
    mockGet.mockRejectedValueOnce(noSession());
    mockFetch.mockResolvedValueOnce(idTokenResponse("<id_token>"));
    mockPost.mockRejectedValueOnce(
      new ApiError(403, "FORBIDDEN", "Authenticated user is not authorized in the backend"),
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeUndefined();
  });

  // ── Caso 5: conflicto de vinculación de cuenta (409) ──────────────────────

  it("error status on account linking conflict (409)", async () => {
    mockGet.mockRejectedValueOnce(noSession());
    mockFetch.mockResolvedValueOnce(idTokenResponse("<id_token>"));
    mockPost.mockRejectedValueOnce(
      new ApiError(409, "CONFLICT", "Auth0 account is already linked to another local account"),
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.user).toBeNull();
    expect(result.current.error).toContain("conflict");
  });

  // ── Caso 6: refreshAuth puede transicionar a "authenticated" ──────────────

  it("refreshAuth transitions from unauthenticated to authenticated", async () => {
    // Carga inicial: sin sesión ni Auth0
    mockGet.mockRejectedValueOnce(noSession());
    mockFetch.mockResolvedValueOnce(idTokenResponse(null));

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    // Tras refreshAuth: sesión backend ya existe (cookie emitida por el navegador)
    mockGet.mockResolvedValueOnce(MOCK_USER);

    await result.current.refreshAuth();

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("ana@example.com");
  });

  // ── Caso 7: error de red propagado como "error" ───────────────────────────

  it("error status on unexpected network failure", async () => {
    mockGet.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "Server exploded"));

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.user).toBeNull();
  });

  // ── Caso 8: logout revoca sesión backend (keepalive fetch) y redirige ───────

  it("logout POSTs to backend with keepalive and redirects to Auth0 with returnTo", async () => {
    // Arrange: start authenticated
    mockGet.mockResolvedValueOnce(MOCK_USER);
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    // Replace window.location with a plain object so href assignment doesn't navigate.
    // origin is required: logout() builds the absolute returnTo using window.location.origin.
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "", search: "", origin: "http://localhost" },
    });

    // logout() uses raw fetch (not apiClient.post) for keepalive support.
    // Backend returns 204 No Content — resolve with a minimal Response-like object.
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await result.current.logout();
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    // Should use raw fetch with keepalive + credentials, NOT apiClient.post
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/logout"),
      expect.objectContaining({ method: "POST", credentials: "include", keepalive: true }),
    );
    expect(mockPost).not.toHaveBeenCalledWith(expect.stringContaining("logout"), expect.anything());
    expect(result.current.user).toBeNull();
    // returnTo must be ABSOLUTE (Auth0 rejects relative URLs with 400).
    // window.location.origin in jsdom is "http://localhost".
    expect((window.location as { href: string }).href).toBe(
      "/api/auth/logout?returnTo=" + encodeURIComponent("http://localhost/login?logged_out=1"),
    );

    // Restore
    if (originalDescriptor) {
      Object.defineProperty(window, "location", originalDescriptor);
    }
  });

  // ── Caso 9: logout redirige aunque el backend falle ──────────────────────

  it("logout redirects to Auth0 even when backend call fails", async () => {
    // Arrange: start authenticated
    mockGet.mockResolvedValueOnce(MOCK_USER);
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "", search: "", origin: "http://localhost" },
    });

    // Backend unreachable — fetch rejects with network error
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await result.current.logout();
    // Even on backend error, state is reset and Auth0 logout is triggered
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    expect(result.current.user).toBeNull();
    // returnTo must be absolute even on backend failure
    expect((window.location as { href: string }).href).toBe(
      "/api/auth/logout?returnTo=" + encodeURIComponent("http://localhost/login?logged_out=1"),
    );

    if (originalDescriptor) {
      Object.defineProperty(window, "location", originalDescriptor);
    }
  });

  // ── Caso 10: guard post-logout — logged_out=1 en URL omite bootstrap Auth0 ─

  it("skips Auth0 bootstrap when URL contains logged_out=1", async () => {
    // Simulate landing on /login?logged_out=1 after Auth0 redirect
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "http://localhost/login?logged_out=1", search: "?logged_out=1" },
    });

    // GET /auth/me → 401 (session was revoked or cookie cleared)
    mockGet.mockRejectedValueOnce(noSession());

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    // Must NOT call fetch (no /api/auth/id-token bootstrap) and NOT call POST /auth/session
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();

    if (originalDescriptor) {
      Object.defineProperty(window, "location", originalDescriptor);
    }
  });
});
