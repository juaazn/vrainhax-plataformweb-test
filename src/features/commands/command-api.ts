import { apiClient } from "@/lib/api/client";
import type { CommandPayload } from "./command-schemas";

export function sendCommand(payload: CommandPayload) {
  return apiClient.post<Record<string, unknown>>("/api/v1/commands", payload);
}
