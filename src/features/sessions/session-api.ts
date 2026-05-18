import { request } from "@/features/api/api-client";

export function createSession(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/api/v1/sessions/activate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function endSession(sessionId: string) {
  return request<Record<string, unknown>>(`/api/v1/sessions/${sessionId}/finish`, {
    method: "POST",
  });
}
