export const BASE_URL =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000')
    : 'http://localhost:5000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: 'include' });
  if (!res.ok) {
    let code = 'API_ERROR';
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      code = body.error ?? code;
      message = body.message ?? message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, code, message);
  }
  // 204 No Content — backend sends no body (e.g. logout). Return undefined without
  // attempting to parse JSON, which would throw SyntaxError on an empty response.
  if (res.status === 204) {
    return undefined as T;
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(buildUrl(path, params), { method: 'GET' });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
};
