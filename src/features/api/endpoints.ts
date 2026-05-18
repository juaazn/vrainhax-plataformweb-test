import { request } from "@/features/api/api-client";

export type HealthPayload = Record<string, unknown>;

export function getHealth() {
  return request<HealthPayload>("/health");
}

export function getReady() {
  return request<HealthPayload>("/ready");
}
