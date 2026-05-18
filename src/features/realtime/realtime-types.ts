import { z } from "zod";

// Tipos de evento que el backend emite hacia /ws/clients
export const realtimeEventTypeSchema = z.enum([
  "device.hello",
  "device.heartbeat",
  "session.started",
  "session.metric.received",
  "session.ended",
]);

export type RealtimeEventType = z.infer<typeof realtimeEventTypeSchema>;

// Schema del ClientRealtimeEvent que el backend envía a /ws/clients
export const clientRealtimeEventSchema = z.object({
  schemaVersion: z.string(),
  eventType: realtimeEventTypeSchema,
  occurredAt: z.string(),
  deviceId: z.string(),
  sessionId: z.string().optional(),
  scene: z.string().optional(),
  summary: z.record(z.string(), z.unknown()),
  rawPayload: z.record(z.string(), z.unknown()),
});

export type ClientRealtimeEvent = z.infer<typeof clientRealtimeEventSchema>;

// Schema flexible para mensajes desconocidos (fallback)
export const unknownEventSchema = z.object({
  schemaVersion: z.string().optional(),
  eventType: z.string(),
  occurredAt: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

// Tipo unificado para el eventLog (evento conocido o desconocido)
export type RealtimeEvent =
  | (ClientRealtimeEvent & { _known: true })
  | { eventType: "unknown"; occurredAt?: string; rawPayload?: unknown; _known: false };

// Parser principal: usa safeParse, nunca lanza excepción
export function parseRealtimeEvent(input: unknown): RealtimeEvent {
  const result = clientRealtimeEventSchema.safeParse(input);
  if (result.success) {
    return { ...result.data, _known: true };
  }
  // Fallback: extraer lo que se pueda del objeto
  const fallback = input as Record<string, unknown> | null | undefined;
  return {
    eventType: "unknown",
    occurredAt: typeof fallback?.occurredAt === "string" ? fallback.occurredAt : undefined,
    rawPayload: fallback,
    _known: false,
  };
}
