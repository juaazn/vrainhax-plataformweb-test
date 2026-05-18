import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ConnectionState } from "@/features/realtime/websocket-client";
import { WebsocketClient } from "@/features/realtime/websocket-client";
import { useRealtimeEvents } from "@/features/realtime/use-realtime-events";
import type { RealtimeEvent } from "@/features/realtime/realtime-types";
import { renderHook } from "@testing-library/react";

// Mock the env module so we control the wsUrl
vi.mock("@/lib/env", () => ({
  env: {
    apiBaseUrl: "http://localhost:5000",
    wsUrl: "ws://localhost:5000/ws/clients",
    appEnv: "development",
    auth0Audience: "https://api.auth-vrainhax.com",
  },
}));

const mockSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
};

// vi.fn().mockImplementation with a regular function (not arrow) so `new` works
const MockWebSocket = vi.fn().mockImplementation(function () {
  return mockSocket;
});

vi.stubGlobal("WebSocket", MockWebSocket);

describe("WebsocketClient", () => {
  let onConnectionChange: (state: ConnectionState) => void;
  let onEvent: (event: RealtimeEvent) => void;
  let client: WebsocketClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket.send.mockClear();
    mockSocket.close.mockClear();
    mockSocket.onopen = null;
    mockSocket.onmessage = null;
    mockSocket.onclose = null;
    mockSocket.onerror = null;
    MockWebSocket.mockClear();

    onConnectionChange = vi.fn() as unknown as (state: ConnectionState) => void;
    onEvent = vi.fn() as unknown as (event: RealtimeEvent) => void;
    client = new WebsocketClient({ onConnectionChange, onEvent });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connect() creates a WebSocket with the correct URL", () => {
    client.connect();
    expect(MockWebSocket).toHaveBeenCalledWith("ws://localhost:5000/ws/clients");
  });

  it("connect() calls onConnectionChange('connecting') immediately", () => {
    client.connect();
    expect(onConnectionChange).toHaveBeenCalledWith("connecting");
  });

  it("onopen calls onConnectionChange('connected')", () => {
    client.connect();
    mockSocket.onopen!(new Event("open"));
    expect(onConnectionChange).toHaveBeenCalledWith("connected");
  });

  it("onmessage with valid JSON calls onEvent with parsed event", () => {
    client.connect();
    const data = JSON.stringify({
      schemaVersion: "1.0",
      eventType: "session.started",
      occurredAt: "2024-01-01T00:00:00.000Z",
      deviceId: "device-001",
      summary: { id: "abc" },
      rawPayload: {},
    });
    mockSocket.onmessage!(new MessageEvent("message", { data }));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "session.started", _known: true }),
    );
  });

  it("onmessage with invalid JSON calls onEvent with event 'unknown'", () => {
    client.connect();
    mockSocket.onmessage!(new MessageEvent("message", { data: "not-json{{" }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "unknown" }));
  });

  it("onclose calls onConnectionChange('disconnected') and schedules retry", () => {
    client.connect();
    MockWebSocket.mockClear();
    mockSocket.onclose!(new CloseEvent("close"));
    expect(onConnectionChange).toHaveBeenCalledWith("disconnected");
    // Retry should not have fired yet
    expect(MockWebSocket).not.toHaveBeenCalled();
    // Advance timer past the 2000ms retry delay
    vi.advanceTimersByTime(2100);
    expect(MockWebSocket).toHaveBeenCalledTimes(1);
  });

  it("disconnect() calls socket.close() and cancels the retry timer", () => {
    client.connect();
    // Trigger onclose to set up retry timer
    mockSocket.onclose!(new CloseEvent("close"));
    MockWebSocket.mockClear();
    // Disconnect before the retry fires
    client.disconnect();
    expect(mockSocket.close).toHaveBeenCalled();
    // Advance past retry delay — connect should NOT be called again
    vi.advanceTimersByTime(3000);
    expect(MockWebSocket).not.toHaveBeenCalled();
  });
});

describe("useRealtimeEvents", () => {
  it("throws when used outside RealtimeProvider", () => {
    // renderHook without a wrapper — useRealtimeContext should throw
    expect(() => renderHook(() => useRealtimeEvents())).toThrow(
      "useRealtimeContext must be used within RealtimeProvider",
    );
  });
});
