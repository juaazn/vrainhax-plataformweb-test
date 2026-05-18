import { describe, expect, it } from "vitest";
import { parseRealtimeEvent } from "@/features/realtime/realtime-types";

describe("realtime parser", () => {
  it("parses known shape", () => {
    const event = parseRealtimeEvent({
      schemaVersion: "1.0",
      eventType: "session.started",
      occurredAt: "2024-01-01T00:00:00.000Z",
      deviceId: "device-001",
      summary: {},
      rawPayload: {},
    });
    expect(event.eventType).toBe("session.started");
    expect(event._known).toBe(true);
  });

  it("fallbacks to unknown", () => {
    const event = parseRealtimeEvent("raw");
    expect(event.eventType).toBe("unknown");
    expect(event._known).toBe(false);
  });
});
