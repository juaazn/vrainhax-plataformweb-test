/**
 * GET /api/auth/id-token
 *
 * Route Handler TEMPORAL para obtener el ID Token de Auth0 desde la sesión servidor.
 *
 * @auth0/nextjs-auth0 v4 almacena el idToken en la sesión cifrada del servidor;
 * el SDK del cliente solo expone el access token. Este endpoint actúa como puente
 * para pruebas manuales del flujo E2E Auth0 → backend.
 *
 * IMPORTANTE: eliminar antes de producción. No exponer idTokens reales en la red.
 */
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "NO_SESSION",
          message: "No hay sesión Auth0 activa. Inicia sesión primero.",
        },
        { status: 401 },
      );
    }

    // En @auth0/nextjs-auth0 v4 el ID Token vive en session.tokenSet.idToken
    const idToken = (session as { tokenSet?: { idToken?: string } }).tokenSet
      ?.idToken;

    if (!idToken) {
      return NextResponse.json(
        {
          error: "NO_ID_TOKEN",
          message:
            "ID Token no disponible en la sesión. Verifica que Auth0 incluya el idToken en la respuesta.",
        },
        { status: 404 },
      );
    }

    // Incluimos sub y email para facilitar la verificación manual
    const sub =
      typeof session.user?.sub === "string" ? session.user.sub : undefined;
    const email =
      typeof session.user?.email === "string" ? session.user.email : undefined;

    return NextResponse.json({ idToken, sub, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
