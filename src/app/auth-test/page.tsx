"use client";

/**
 * /auth-test — Verificación E2E del flujo completo Auth0 → backend → cookie session
 *
 * Secciones:
 *   A — Login: Auth0 session → idToken → backend session → /auth/me
 *   B — Logout: backend session revocada → /auth/me 401 → /api/auth/id-token 200
 *   C — Post-Auth0-logout: /api/auth/id-token 401 (detectado por ?auth_logout_done=1)
 *
 * TEMPORAL — eliminar antes de producción.
 */

import { useCallback, useEffect, useState } from "react";

// ─── tipos ───────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "loading" | "ok" | "error";

interface StepState<T = unknown> {
  status: StepStatus;
  data?: T;
  error?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const BACKEND = "http://localhost:5000";

function badge(status: StepStatus) {
  const map: Record<StepStatus, string> = {
    idle: "bg-slate-100 text-slate-500",
    loading: "bg-yellow-100 text-yellow-700 animate-pulse",
    ok: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  const label: Record<StepStatus, string> = {
    idle: "pendiente",
    loading: "ejecutando…",
    ok: "OK",
    error: "ERROR",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function ResultBox({ data, error }: { data?: unknown; error?: string }) {
  if (error)
    return (
      <pre className="mt-2 overflow-x-auto rounded bg-red-50 p-3 text-xs text-red-800">
        {error}
      </pre>
    );
  if (data !== undefined)
    return (
      <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-3 text-xs text-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  return null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-800">
      {children}
    </h2>
  );
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchIdToken(): Promise<{ ok: boolean; idToken?: string; sub?: string; email?: string; error?: string }> {
  const res = await fetch("/api/auth/id-token");
  const data = (await res.json()) as { idToken?: string; sub?: string; email?: string; error?: string; message?: string };
  if (res.ok && data.idToken) return { ok: true, idToken: data.idToken, sub: data.sub, email: data.email };
  return { ok: false, error: `${data.message ?? data.error ?? "error"} (HTTP ${res.status})` };
}

async function fetchAuthMe(withCookie = true): Promise<{ ok: boolean; data?: unknown; status: number }> {
  const res = await fetch(`${BACKEND}/api/v1/auth/me`, {
    credentials: withCookie ? "include" : "omit",
  });
  const data: unknown = await res.json().catch(() => null);
  return { ok: res.ok, data, status: res.status };
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function AuthTestPage() {
  // ── Sección A: Login ────────────────────────────────────────────────────────
  const [step1, setStep1] = useState<StepState>({ status: "idle" });
  const [step2, setStep2] = useState<StepState<{ idToken: string; sub?: string; email?: string }>>({ status: "idle" });
  const [step3, setStep3] = useState<StepState>({ status: "idle" });
  const [step4, setStep4] = useState<StepState>({ status: "idle" });

  // ── Sección B: Logout (backend only — sin navegar) ──────────────────────────
  const [stepL1, setStepL1] = useState<StepState>({ status: "idle" }); // POST /auth/logout
  const [stepL2, setStepL2] = useState<StepState>({ status: "idle" }); // GET /auth/me → 401
  const [stepL3, setStepL3] = useState<StepState>({ status: "idle" }); // GET /api/auth/id-token → 200 (Auth0 aún activa)

  // ── Sección C: Post-Auth0-logout ────────────────────────────────────────────
  const [stepC1, setStepC1] = useState<StepState>({ status: "idle" }); // GET /api/auth/id-token → 401
  const [stepC2, setStepC2] = useState<StepState>({ status: "idle" }); // GET /auth/me → 401

  // ── Sección C: funciones estables para auto-run en useEffect ──────────────────
  // Declaradas antes del useEffect para evitar "used before declaration".
  // useCallback con [] porque solo cierran sobre state setters (estables).

  const runStepC1 = useCallback(async () => {
    setStepC1({ status: "loading" });
    const result = await fetchIdToken();
    if (!result.ok) {
      setStepC1({ status: "ok", data: { status: "401", note: "Correcto: __session eliminada — Auth0 SDK devuelve null.", error: result.error } });
    } else {
      setStepC1({
        status: "error",
        error: `Esperaba 401 pero la sesión Auth0 sigue activa. Verifica Set-Cookie en /api/auth/logout.`,
        data: { sub: result.sub, email: result.email },
      });
    }
  }, []);

  const runStepC2 = useCallback(async () => {
    setStepC2({ status: "loading" });
    const r = await fetchAuthMe(true);
    if (r.status === 401) {
      setStepC2({ status: "ok", data: { status: 401, note: "Correcto: vrainhax_session eliminada.", response: r.data } });
    } else {
      setStepC2({ status: "error", error: `Esperaba 401 pero obtuvo ${r.status}.`, data: r.data });
    }
  }, []);

  // Detectar retorno del logout de Auth0: leer URL en el initializer evita setState
  // sincrónico dentro de useEffect (que dispara cascading renders según lint rules).
  const [postLogout] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("auth_logout_done") === "1",
  );

  // Auto-ejecutar verificaciones si llegamos desde Auth0 logout.
  // setTimeout(0) difiere los setState fuera del cuerpo sincrónico del efecto,
  // evitando el warning de "calling setState synchronously within an effect".
  useEffect(() => {
    if (!postLogout) return;
    const t1 = window.setTimeout(() => { void runStepC1(); }, 0);
    const t2 = window.setTimeout(() => { void runStepC2(); }, 50);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [postLogout, runStepC1, runStepC2]);

  // ── Sección A: Login steps ──────────────────────────────────────────────────

  async function runStep1() {
    setStep1({ status: "loading" });
    try {
      const res = await fetch("/api/auth/profile");
      const data: unknown = await res.json();
      setStep1(res.ok ? { status: "ok", data } : { status: "error", error: `${res.status} — No hay sesión Auth0 activa.`, data });
    } catch (err) {
      setStep1({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function runStep2() {
    setStep2({ status: "loading" });
    const result = await fetchIdToken();
    if (result.ok && result.idToken) {
      setStep2({ status: "ok", data: { idToken: result.idToken, sub: result.sub, email: result.email } });
    } else {
      setStep2({ status: "error", error: result.error });
    }
  }

  async function runStep3() {
    if (!step2.data?.idToken) {
      setStep3({ status: "error", error: "Primero ejecuta el Paso 2." });
      return;
    }
    setStep3({ status: "loading" });
    try {
      const res = await fetch(`${BACKEND}/api/v1/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken: step2.data.idToken }),
      });
      const data: unknown = await res.json();
      setStep3(res.ok ? { status: "ok", data } : { status: "error", error: `HTTP ${res.status}`, data });
    } catch (err) {
      setStep3({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function runStep4() {
    setStep4({ status: "loading" });
    const r = await fetchAuthMe(true);
    if (r.ok) {
      setStep4({ status: "ok", data: r.data });
    } else {
      setStep4({ status: "error", error: `HTTP ${r.status}`, data: r.data });
    }
  }

  async function runStep4NoCookie() {
    setStep4({ status: "loading" });
    const r = await fetchAuthMe(false);
    if (r.status === 401) {
      setStep4({ status: "ok", data: { note: "Correcto: 401 sin cookie", response: r.data } });
    } else {
      setStep4({ status: "error", error: `Esperaba 401 pero obtuvo ${r.status}`, data: r.data });
    }
  }

  // ── Sección B: Logout steps ─────────────────────────────────────────────────

  async function runStepL1() {
    setStepL1({ status: "loading" });
    setStepL2({ status: "idle" });
    setStepL3({ status: "idle" });
    try {
      const res = await fetch(`${BACKEND}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 204) {
        setStepL1({
          status: "ok",
          data: {
            status: 204,
            note: "Sesión backend revocada. Set-Cookie: vrainhax_session=; Max-Age=0 enviado.",
            hint: "Verifica en DevTools → Network → POST /api/v1/auth/logout → Set-Cookie header.",
          },
        });
      } else {
        const data: unknown = await res.json().catch(() => null);
        setStepL1({ status: "error", error: `HTTP ${res.status} — esperaba 204`, data });
      }
    } catch (err) {
      setStepL1({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function runStepL2() {
    setStepL2({ status: "loading" });
    const r = await fetchAuthMe(true);
    if (r.status === 401) {
      setStepL2({ status: "ok", data: { status: 401, note: "Correcto: vrainhax_session cookie eliminada o revocada.", response: r.data } });
    } else {
      setStepL2({ status: "error", error: `Esperaba 401 pero obtuvo ${r.status} — la cookie puede seguir activa.`, data: r.data });
    }
  }

  async function runStepL3() {
    setStepL3({ status: "loading" });
    const result = await fetchIdToken();
    if (result.ok) {
      setStepL3({
        status: "ok",
        data: {
          note: "Correcto: sesión Auth0 (__session) SIGUE activa (solo se cerró el backend).",
          sub: result.sub,
          email: result.email,
          idTokenHead: result.idToken?.slice(0, 50) + "…",
        },
      });
    } else {
      // Si ya retorna 401 aquí, la cookie __session fue borrada ANTES de navegar a Auth0 logout
      setStepL3({
        status: "error",
        error: `${result.error} — Auth0 session ya no está activa. ¿Se ejecutó el logout completo antes?`,
      });
    }
  }

  // ── derivados de estado ──────────────────────────────────────────────────────

  const canStep2 = step1.status === "ok";
  const canStep3 = step2.status === "ok";
  const canStep4 = step3.status === "ok";
  const canLogout = step3.status === "ok"; // hay sesión backend
  const returnToAuthLogout = `/api/auth/logout?returnTo=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/auth-test?auth_logout_done=1`)}`;

  return (
    <div className="max-w-3xl space-y-10 p-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-semibold">Auth0 E2E — Panel de Verificación</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verifica la cadena completa: Auth0 login → idToken → sesión backend → logout completo
        </p>
        <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          TEMPORAL — Eliminar antes de producción. Backend en{" "}
          <code className="font-mono">{BACKEND}</code>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECCIÓN A — LOGIN
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>A — Verificación de Login</SectionTitle>

        <div className="flex gap-3">
          <a href="/api/auth/login" className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            Login con Auth0
          </a>
        </div>

        {/* Paso 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="A1" />
            <span className="text-sm font-medium">Verificar sesión Auth0</span>
            {badge(step1.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">GET /api/auth/profile</p>
          <div className="pl-10">
            <Btn onClick={runStep1} loading={step1.status === "loading"}>Comprobar sesión Auth0</Btn>
            <ResultBox data={step1.status !== "error" ? step1.data : undefined} error={step1.error} />
          </div>
        </div>

        {/* Paso 2 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="A2" />
            <span className="text-sm font-medium">Obtener ID Token</span>
            {badge(step2.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">GET /api/auth/id-token — lee session.tokenSet.idToken del servidor</p>
          <div className="pl-10">
            <Btn onClick={runStep2} loading={step2.status === "loading"} disabled={!canStep2}>
              Obtener idToken
            </Btn>
            {step2.status === "ok" && step2.data && (
              <div className="mt-2 space-y-1 rounded bg-slate-100 p-3">
                <p className="text-xs"><strong>sub:</strong> {step2.data.sub ?? "—"}</p>
                <p className="text-xs"><strong>email:</strong> {step2.data.email ?? "—"}</p>
                <p className="break-all font-mono text-xs">
                  <strong>idToken:</strong> {step2.data.idToken.slice(0, 60)}… ({step2.data.idToken.length} chars)
                </p>
              </div>
            )}
            {step2.status === "error" && <ResultBox error={step2.error} />}
          </div>
        </div>

        {/* Paso 3 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="A3" />
            <span className="text-sm font-medium">Crear sesión backend</span>
            {badge(step3.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            POST {BACKEND}/api/v1/auth/session — valida JWT, vincula auth0_sub, devuelve Set-Cookie: vrainhax_session
          </p>
          <div className="pl-10">
            <Btn onClick={runStep3} loading={step3.status === "loading"} disabled={!canStep3}>
              POST /auth/session
            </Btn>
            <ResultBox data={step3.status !== "error" ? step3.data : undefined} error={step3.error} />
          </div>
        </div>

        {/* Paso 4 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="A4" />
            <span className="text-sm font-medium">Verificar sesión backend</span>
            {badge(step4.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            GET {BACKEND}/api/v1/auth/me — usa vrainhax_session cookie
          </p>
          <div className="flex gap-2 pl-10">
            <Btn onClick={runStep4} loading={step4.status === "loading"} disabled={!canStep4} className="bg-green-600 hover:bg-green-700">
              GET /auth/me (con cookie)
            </Btn>
            <Btn variant="outline" onClick={runStep4NoCookie} loading={step4.status === "loading"}>
              GET /auth/me (sin cookie → debe dar 401)
            </Btn>
          </div>
          <div className="pl-10">
            <ResultBox data={step4.status !== "error" ? step4.data : undefined} error={step4.error} />
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECCIÓN B — LOGOUT (sin navegar — verifica cadena backend)
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>B — Verificación de Logout de Backend</SectionTitle>
        <p className="text-xs text-slate-500">
          Esta sección revoca solo la sesión de PostgreSQL y borra la cookie <code>vrainhax_session</code>.
          La sesión Auth0 (<code>__session</code>) se mantiene hasta el logout completo de Auth0 (Sección C).
        </p>

        {/* Paso L1: POST /auth/logout */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="B1" />
            <span className="text-sm font-medium">Revocar sesión backend</span>
            {badge(stepL1.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            POST {BACKEND}/api/v1/auth/logout — espera 204 + <code>Set-Cookie: vrainhax_session=; Max-Age=0</code>
          </p>
          <div className="pl-10">
            <Btn onClick={runStepL1} loading={stepL1.status === "loading"} disabled={!canLogout} className="bg-orange-600 hover:bg-orange-700">
              POST /auth/logout (backend only)
            </Btn>
            {!canLogout && stepL1.status === "idle" && (
              <p className="mt-1 text-xs text-slate-400">Completa A3 (crear sesión) antes.</p>
            )}
            <ResultBox data={stepL1.status !== "error" ? stepL1.data : undefined} error={stepL1.error} />
          </div>
        </div>

        {/* Paso L2: /auth/me → 401 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="B2" />
            <span className="text-sm font-medium">GET /auth/me → debe ser 401</span>
            {badge(stepL2.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            Confirma que <code>vrainhax_session</code> fue eliminada por el backend.
          </p>
          <div className="pl-10">
            <Btn onClick={runStepL2} loading={stepL2.status === "loading"} disabled={stepL1.status !== "ok"}>
              GET /auth/me (espera 401)
            </Btn>
            <ResultBox data={stepL2.status !== "error" ? stepL2.data : undefined} error={stepL2.error} />
          </div>
        </div>

        {/* Paso L3: /api/auth/id-token → debe ser 200 (Auth0 aún activa) */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="B3" />
            <span className="text-sm font-medium">GET /api/auth/id-token → debe ser 200 aún</span>
            {badge(stepL3.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            Confirma que la sesión Auth0 (<code>__session</code>) SIGUE activa — solo el backend se desconectó.
            Si esto da 401, la cookie Auth0 ya desapareció antes de navegar.
          </p>
          <div className="pl-10">
            <Btn onClick={runStepL3} loading={stepL3.status === "loading"} disabled={stepL1.status !== "ok"}>
              GET /api/auth/id-token (espera 200)
            </Btn>
            <ResultBox data={stepL3.status !== "error" ? stepL3.data : undefined} error={stepL3.error} />
          </div>
        </div>

        {/* SQL hint */}
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <strong>Verificación PostgreSQL (ejecutar en psql o DBeaver):</strong>
          <pre className="mt-1 overflow-x-auto font-mono">{`SELECT session_id, user_id, created_at, last_seen_at, revoked_at, expires_at
FROM auth_sessions
ORDER BY created_at DESC
LIMIT 5;`}</pre>
          <p className="mt-1">La fila más reciente debe tener <code>revoked_at IS NOT NULL</code> si B1 tuvo éxito.</p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECCIÓN C — LOGOUT COMPLETO (Auth0 + Next.js)
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>C — Logout Completo Auth0 + Verificación Post-Logout</SectionTitle>
        <p className="text-xs text-slate-500">
          Navega a <code>/api/auth/logout</code>. El proxy borra las cookies Auth0 en el redirect.
          Auth0 redirige de vuelta aquí con <code>?auth_logout_done=1</code>, que dispara C1 y C2 automáticamente.
        </p>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Requisito Auth0 Dashboard:</strong> Añade{" "}
          <code>http://localhost:3000/auth-test?auth_logout_done=1</code> a{" "}
          <em>Applications → vrainhax_web_test → Settings → Allowed Logout URLs</em> para que Auth0
          acepte este returnTo.
          <br />
          (Alternativa: usa el botón de la topbar que va a <code>/login?logged_out=1</code>.)
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Logout completo con returnTo a auth-test */}
          <a
            href={postLogout ? "#" : returnToAuthLogout}
            onClick={postLogout ? (e) => e.preventDefault() : undefined}
            className={`rounded px-4 py-2 text-sm font-medium text-white transition ${
              postLogout
                ? "cursor-not-allowed bg-slate-400"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Logout Auth0 (returnTo: /auth-test)
          </a>
          {/* Logout estándar con returnTo a login */}
          <a
            href={`/api/auth/logout?returnTo=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/login?logged_out=1`)}`}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Logout Auth0 (returnTo: /login — flujo normal)
          </a>
        </div>

        {postLogout && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            ✓ Retorno detectado desde logout Auth0 (<code>?auth_logout_done=1</code>). Verificando…
          </div>
        )}

        {/* Paso C1: /api/auth/id-token → 401 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="C1" />
            <span className="text-sm font-medium">GET /api/auth/id-token → debe ser 401</span>
            {badge(stepC1.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            Confirma que la cookie <code>__session</code> (y chunks) fue borrada por el proxy.
          </p>
          <div className="pl-10">
            <Btn onClick={runStepC1} loading={stepC1.status === "loading"}>
              GET /api/auth/id-token (espera 401)
            </Btn>
            <ResultBox data={stepC1.status !== "error" ? stepC1.data : undefined} error={stepC1.error} />
          </div>
        </div>

        {/* Paso C2: /auth/me → 401 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StepBadge n="C2" />
            <span className="text-sm font-medium">GET /api/v1/auth/me → debe ser 401</span>
            {badge(stepC2.status)}
          </div>
          <p className="pl-10 text-xs text-slate-500">
            Confirma que la cookie <code>vrainhax_session</code> fue borrada por el backend.
          </p>
          <div className="pl-10">
            <Btn onClick={runStepC2} loading={stepC2.status === "loading"}>
              GET /auth/me (espera 401)
            </Btn>
            <ResultBox data={stepC2.status !== "error" ? stepC2.data : undefined} error={stepC2.error} />
          </div>
        </div>

        {/* Hint logged_out guard */}
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <strong>Verificación de logged_out=1 guard:</strong>
          <ol className="mt-1 list-decimal pl-4 space-y-0.5">
            <li>Usa el botón &quot;Logout Auth0 (returnTo: /login — flujo normal)&quot;.</li>
            <li>Auth0 redirige a <code>/login?logged_out=1</code>.</li>
            <li>
              Abre DevTools → Console. <code>AuthProvider.refreshAuth()</code> debe detectar{" "}
              <code>logged_out=1</code> y terminar con <code>status = &quot;unauthenticated&quot;</code>{" "}
              <em>sin</em> llamar a <code>POST /api/v1/auth/session</code>.
            </li>
            <li>Verifica en DevTools → Network que no aparece ningún <code>POST /auth/session</code> tras el redirect.</li>
          </ol>
        </div>

        {/* DevTools checklist */}
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <strong>Checklist DevTools (manual):</strong>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>
              Network → <code>POST /api/v1/auth/logout</code>: respuesta 204 +{" "}
              <code>Set-Cookie: vrainhax_session=; Max-Age=0; Path=/; HttpOnly</code>
            </li>
            <li>
              Network → <code>GET /api/auth/logout?returnTo=...</code>: respuesta 302 +{" "}
              <code>Set-Cookie: __session=; Max-Age=0</code> (y cualquier chunk <code>__session__0</code>, etc.)
            </li>
            <li>
              Application → Cookies → <code>localhost:3000</code>: ni <code>__session</code> ni chunks tras el logout
            </li>
            <li>
              Application → Cookies → <code>localhost:5000</code>: <code>vrainhax_session</code> ausente
            </li>
          </ul>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          RESUMEN
      ─────────────────────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-600">Resumen de pasos</h2>
        <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
          {[
            [step1.status, "A1 — Auth0 session activa"],
            [step2.status, "A2 — ID Token obtenido"],
            [step3.status, "A3 — Backend session creada (vrainhax_session)"],
            [step4.status, "A4 — /auth/me verificado"],
            [stepL1.status, "B1 — Backend session revocada"],
            [stepL2.status, "B2 — /auth/me → 401"],
            [stepL3.status, "B3 — Auth0 session aún activa post-backend-logout"],
            [stepC1.status, "C1 — /api/auth/id-token → 401 (Auth0 cookie borrada)"],
            [stepC2.status, "C2 — /auth/me → 401 (backend cookie borrada)"],
          ].map(([status, label]) => (
            <div key={label as string} className="flex items-center gap-2">
              {badge(status as StepStatus)}
              <span>{label as string}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function StepBadge({ n }: { n: string }) {
  return (
    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-200 px-2 text-xs font-bold text-slate-600">
      {n}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  loading,
  className = "bg-slate-700 hover:bg-slate-800",
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  variant?: "outline";
}) {
  const base =
    variant === "outline"
      ? "rounded border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      : `rounded px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${className}`;
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled || loading}
      className={base}
    >
      {loading ? "Ejecutando…" : children}
    </button>
  );
}
