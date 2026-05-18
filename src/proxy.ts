import { auth0 } from "@/lib/auth0";

/**
 * Next.js 16 proxy (edge boundary — runs before every request matching the config matcher).
 *
 * Auth0 SDK internals use `x-middleware-set-cookie` to propagate cookie mutations.
 * For `NextResponse.next()` responses, Next.js picks up that internal header and merges
 * it into the downstream response.  For *redirect* responses the internal header is
 * forwarded to the request headers only (`resolve-routes.js`) and then stripped in
 * `send-response.js` — so the browser **never** receives the `Set-Cookie` deletion that
 * `handleLogout()` schedules.
 *
 * Work-around: after `auth0.middleware()` processes a logout request and returns a redirect,
 * we clone the response and append explicit `Set-Cookie: <name>=; Max-Age=0` headers so
 * that the browser definitively deletes all session cookies before following the redirect.
 *
 * Cookie families managed by @auth0/nextjs-auth0 v4 (stateless store):
 *   __session          — main session cookie
 *   __session__0, ...  — chunks when session JWT >3 500 bytes
 *   appSession         — legacy v3 cookie name (migration compat)
 *   appSession.0, ...  — legacy v3 chunks
 *   __FC_0, ...        — connection token sets (federated connections)
 *
 * WARNING: WORKAROUND DEFENSIVO — no es un contrato estable del SDK.
 * El borrado manual de cookies es necesario porque next.js send-response.js
 * filtra x-middleware-set-cookie de respuestas redirect (3xx). El SDK de Auth0
 * programa la eliminacion via ese header interno, pero el navegador nunca la recibe.
 *
 * Riesgos:
 *  - Si el SDK cambia nombres de cookies en versiones futuras, este workaround
 *    falla silenciosamente. Verificar con cada upgrade de @auth0/nextjs-auth0.
 *  - Si se configura session.cookie.name en Auth0Client, actualizar isAuth0Cookie().
 *  - Path=/ y sin Domain explicito (correcto para localhost). En produccion, si
 *    las cookies usan un Domain o Path diferente, actualizar las opciones de borrado.
 *
 * Eliminar este bloque si Next.js corrige el comportamiento de send-response.js
 * para propagar x-middleware-set-cookie tambien en respuestas redirect.
 * Ref: progress/history.md entrada 2026-05-13.
 */

/** Returns true for any cookie that belongs to the Auth0 SDK session layer. */
function isAuth0Cookie(name: string): boolean {
  return (
    name === "__session" ||
    name.startsWith("__session__") || // v4 chunks
    name === "appSession" ||
    name.startsWith("appSession.") || // v3 legacy chunks
    name.startsWith("__FC") // federated connection token sets
  );
}

/**
 * Parses a `Cookie` request header and returns all cookie names.
 * Edge-safe — no third-party deps.
 */
function parseRequestCookieNames(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  const names: string[] = [];
  for (const pair of cookieHeader.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) {
      names.push(pair.slice(0, eqIdx).trim());
    }
  }
  return names;
}

export async function proxy(request: Request) {
  const response = await auth0.middleware(request);

  const url = new URL(request.url);
  const isLogoutRoute = url.pathname === "/api/auth/logout";
  const isRedirect = response.status >= 300 && response.status < 400;

  if (isLogoutRoute && isRedirect) {
    const headers = new Headers(response.headers);

    // Build the set of cookies to clear.
    // We always include the base names so they are cleared even if the SDK
    // already removed them from reqCookies before we read them.
    const toClear = new Set<string>(["__session", "appSession"]);

    // Also clear any chunks / FC cookies that are actually present in the
    // incoming request (the SDK's deleteChunkedCookie would have cleared them
    // via x-middleware-set-cookie, but that header is stripped from redirect
    // responses by send-response.js, so we replicate it here explicitly).
    for (const name of parseRequestCookieNames(request.headers.get("cookie"))) {
      if (isAuth0Cookie(name)) toClear.add(name);
    }

    for (const name of toClear) {
      // Path, HttpOnly and SameSite must match the original Set-Cookie attributes.
      headers.append(
        "set-cookie",
        `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
