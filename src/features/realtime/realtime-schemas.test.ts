import { describe, expect, it } from "vitest";
import { commandSchema } from "@/features/commands/command-schemas";
import { metricSchema } from "@/features/metrics/metric-schemas";

describe("schemas", () => {
  it("validates command payload", () => {
    expect(
      commandSchema.safeParse({
        type: "command.start_session",
        device_id: "aaaaaaaa-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
    expect(commandSchema.safeParse({ type: "unknown_command", device_id: "not-a-uuid" }).success).toBe(false);
  });

  it("validates metric payload", () => {
    expect(metricSchema.safeParse({ session_id: "test-session-001" }).success).toBe(true);
    expect(metricSchema.safeParse("invalid").success).toBe(false);
  });
});
