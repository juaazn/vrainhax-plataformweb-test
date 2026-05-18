import { request } from "@/features/api/api-client";

export function listDevices() {
  return request<Record<string, unknown>>("/devices");
}
