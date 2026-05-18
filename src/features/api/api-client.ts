import { getAccessToken as getAuth0AccessToken } from "@auth0/nextjs-auth0/client";
import { env } from "@/lib/env";

export type ApiError = {
  error: string;
  message: string;
  statusCode: number;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
  responseTimeMs: number;
};

function unwrapPayload<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Object.keys(payload).length === 1
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function getBearerToken(): Promise<string | null> {
  try {
    return await getAuth0AccessToken({
      route: "/api/auth/token",
      ...(env.auth0Audience ? { audience: env.auth0Audience } : {}),
    });
  } catch {
    return null;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const start = performance.now();
  try {
    const token = await getBearerToken();
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(init?.headers ?? {}),
      },
    });
    const responseTimeMs = performance.now() - start;
    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      const fallback: ApiError = {
        error: "http_error",
        message: response.statusText || "Request failed",
        statusCode: response.status,
      };
      const apiError = (payload && typeof payload === "object" ? payload : fallback) as ApiError;
      throw apiError;
    }

    return { data: unwrapPayload<T>(payload), status: response.status, responseTimeMs };
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    throw {
      error: "network_error",
      message: error instanceof Error ? error.message : "Network error",
      statusCode: 0,
    } as ApiError;
  }
}
