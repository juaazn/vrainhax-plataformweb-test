import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeviceRealtime } from './use-device-realtime';

let wsInstances: MockWebSocket[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 0;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = 3;
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '', wasClean: true } as CloseEvent);
  });
  send = vi.fn();

  constructor(public url: string) {
    wsInstances.push(this);
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.({ type: 'open' } as Event);
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data), type: 'message' } as MessageEvent);
  }

  simulateClose(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code, reason: '', wasClean: code === 1000 } as CloseEvent);
  }
}

beforeEach(() => {
  wsInstances = [];
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDeviceRealtime', () => {
  it('transitions to connecting state on mount', () => {
    const { result } = renderHook(() => useDeviceRealtime());
    expect(result.current.connectionState).toBe('connecting');
    expect(wsInstances).toHaveLength(1);
  });

  it('transitions to connected state when WS opens', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    expect(result.current.connectionState).toBe('connected');
  });

  it('populates deviceStates from server.snapshot message', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    act(() => {
      wsInstances[0].simulateMessage({
        schemaVersion: '1.0',
        eventType: 'server.snapshot',
        occurredAt: '2025-01-01T00:00:00Z',
        devices: [
          {
            deviceId: 'dev-1',
            connectionStatus: 'connected',
            lastSeenAt: '2025-01-01T00:00:00Z',
            deviceName: 'VR Headset A',
            deviceType: 'headset',
          },
        ],
      });
    });

    expect(result.current.deviceStates.size).toBe(1);
    expect(result.current.deviceStates.get('dev-1')).toMatchObject({
      deviceId: 'dev-1',
      connectionStatus: 'connected',
      deviceName: 'VR Headset A',
    });
  });

  it('updates deviceStates on device.connected event', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    act(() => {
      wsInstances[0].simulateMessage({
        schemaVersion: '1.0',
        eventType: 'device.connected',
        occurredAt: '2025-01-01T00:01:00Z',
        deviceId: 'dev-2',
        sessionId: 'sess-1',
        summary: {
          deviceName: 'VR Headset B',
          deviceType: 'headset',
          serialNumber: 'SN-002',
        },
      });
    });

    expect(result.current.deviceStates.get('dev-2')).toMatchObject({
      deviceId: 'dev-2',
      connectionStatus: 'connected',
      deviceName: 'VR Headset B',
      sessionId: 'sess-1',
    });
    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.recentEvents[0].eventType).toBe('device.connected');
  });

  it('sets connectionStatus to disconnected on device.disconnected event', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    // First connect the device
    act(() => {
      wsInstances[0].simulateMessage({
        schemaVersion: '1.0',
        eventType: 'device.connected',
        occurredAt: '2025-01-01T00:01:00Z',
        deviceId: 'dev-3',
        summary: { deviceName: 'VR Headset C' },
      });
    });

    expect(result.current.deviceStates.get('dev-3')?.connectionStatus).toBe('connected');

    // Then disconnect
    act(() => {
      wsInstances[0].simulateMessage({
        schemaVersion: '1.0',
        eventType: 'device.disconnected',
        occurredAt: '2025-01-01T00:05:00Z',
        deviceId: 'dev-3',
        summary: { connectionStatus: 'disconnected', reason: 'timeout' },
      });
    });

    expect(result.current.deviceStates.get('dev-3')?.connectionStatus).toBe('disconnected');
  });

  it('updates connectionStatus and batteryLevel on device.heartbeat', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    act(() => {
      wsInstances[0].simulateMessage({
        schemaVersion: '1.0',
        eventType: 'device.heartbeat',
        occurredAt: '2025-01-01T00:02:00Z',
        deviceId: 'dev-4',
        sessionId: 'sess-2',
        summary: {
          connectionStatus: 'connected',
          batteryLevel: 85,
          sessionActive: true,
          uptimeSeconds: 300,
          scene: 'MainMenu',
        },
      });
    });

    expect(result.current.deviceStates.get('dev-4')).toMatchObject({
      deviceId: 'dev-4',
      connectionStatus: 'connected',
      batteryLevel: 85,
      sessionActive: true,
      sessionId: 'sess-2',
      scene: 'MainMenu',
    });
  });

  it('transitions to reconnecting state on unexpected close (code 1006)', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    expect(result.current.connectionState).toBe('connected');

    act(() => {
      wsInstances[0].simulateClose(1006);
    });

    expect(result.current.connectionState).toBe('reconnecting');
  });

  it('disconnect() transitions to disconnected and calls WS.close', () => {
    const { result } = renderHook(() => useDeviceRealtime());

    act(() => {
      wsInstances[0].simulateOpen();
    });

    expect(result.current.connectionState).toBe('connected');

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.connectionState).toBe('disconnected');
    expect(wsInstances[0].close).toHaveBeenCalledWith(1000, 'Client disconnect');
  });
});
