'use client';

import { useEffect, useRef, useReducer, useCallback } from 'react';
import type {
  RealtimeConnectionState,
  DeviceRealtimeState,
  ClientRealtimeEvent,
  ClientEventType,
} from '@/types/realtime.types';

const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1_500;
const MAX_EVENTS = 50;

// Derivar URL WS desde la base HTTP
function buildWsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';
  return base.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/clients';
}

interface State {
  connectionState: RealtimeConnectionState;
  deviceStates: Map<string, DeviceRealtimeState>;
  recentEvents: ClientRealtimeEvent[];
  retryCount: number;
}

type Action =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'RECONNECTING'; retryCount: number }
  | { type: 'UNAVAILABLE' }
  | { type: 'ERROR' }
  | { type: 'DEVICE_UPDATE'; device: DeviceRealtimeState }
  | { type: 'SNAPSHOT'; devices: DeviceRealtimeState[] }
  | { type: 'EVENT'; event: ClientRealtimeEvent };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, connectionState: 'connecting' };
    case 'CONNECTED':
      return { ...state, connectionState: 'connected', retryCount: 0 };
    case 'DISCONNECTED':
      return { ...state, connectionState: 'disconnected' };
    case 'RECONNECTING':
      return { ...state, connectionState: 'reconnecting', retryCount: action.retryCount };
    case 'UNAVAILABLE':
      return { ...state, connectionState: 'unavailable' };
    case 'ERROR':
      return { ...state, connectionState: 'error' };
    case 'SNAPSHOT': {
      const map = new Map<string, DeviceRealtimeState>();
      for (const d of action.devices) map.set(d.deviceId, d);
      return { ...state, deviceStates: map };
    }
    case 'DEVICE_UPDATE': {
      const map = new Map(state.deviceStates);
      map.set(action.device.deviceId, action.device);
      return { ...state, deviceStates: map };
    }
    case 'EVENT': {
      const events = [action.event, ...state.recentEvents].slice(0, MAX_EVENTS);
      return { ...state, recentEvents: events };
    }
    default:
      return state;
  }
}

const initialState: State = {
  connectionState: 'idle',
  deviceStates: new Map(),
  recentEvents: [],
  retryCount: 0,
};

export interface UseDeviceRealtimeResult {
  connectionState: RealtimeConnectionState;
  deviceStates: Map<string, DeviceRealtimeState>;
  recentEvents: ClientRealtimeEvent[];
  connect: () => void;
  disconnect: () => void;
}

export function useDeviceRealtime(): UseDeviceRealtimeResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const manualCloseRef = useRef(false);
  // Stable ref so onclose can schedule reconnect without a circular dependency
  const connectWsRef = useRef<() => void>(() => {});

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return; // CONNECTING or OPEN

    manualCloseRef.current = false;
    dispatch({ type: 'CONNECTING' });

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      dispatch({ type: 'CONNECTED' });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;

        if (data.eventType === 'server.snapshot') {
          const devices = (data.devices as DeviceRealtimeState[]) ?? [];
          dispatch({ type: 'SNAPSHOT', devices });
          return;
        }

        const eventType = data.eventType as ClientEventType;
        const clientEvent: ClientRealtimeEvent = {
          schemaVersion: String(data.schemaVersion ?? '1.0'),
          eventType,
          occurredAt: String(data.occurredAt ?? new Date().toISOString()),
          deviceId: String(data.deviceId ?? ''),
          ...(data.sessionId ? { sessionId: String(data.sessionId) } : {}),
          summary: (data.summary as Record<string, unknown>) ?? {},
          rawPayload: (data.rawPayload as Record<string, unknown>) ?? {},
        };

        dispatch({ type: 'EVENT', event: clientEvent });

        // Update device state from events
        if (eventType === 'device.connected') {
          dispatch({
            type: 'DEVICE_UPDATE',
            device: {
              deviceId: clientEvent.deviceId,
              connectionStatus: 'connected',
              lastSeenAt: clientEvent.occurredAt,
              deviceName: clientEvent.summary.deviceName as string | undefined,
              deviceType: clientEvent.summary.deviceType as string | undefined,
              sessionId: clientEvent.sessionId,
            },
          });
        } else if (eventType === 'device.disconnected') {
          dispatch({
            type: 'DEVICE_UPDATE',
            device: {
              deviceId: clientEvent.deviceId,
              connectionStatus: 'disconnected',
              lastSeenAt: clientEvent.occurredAt,
            },
          });
        } else if (eventType === 'device.heartbeat') {
          dispatch({
            type: 'DEVICE_UPDATE',
            device: {
              deviceId: clientEvent.deviceId,
              connectionStatus:
                (clientEvent.summary.connectionStatus as 'connected' | 'disconnected' | 'busy') ??
                'connected',
              lastSeenAt: clientEvent.occurredAt,
              sessionId: clientEvent.sessionId,
              sessionActive: clientEvent.summary.sessionActive as boolean | undefined,
              batteryLevel: clientEvent.summary.batteryLevel as number | null | undefined,
              scene: clientEvent.summary.scene as string | undefined,
            },
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = (event: CloseEvent) => {
      wsRef.current = null;
      if (manualCloseRef.current) {
        dispatch({ type: 'DISCONNECTED' });
        return;
      }
      // If code is 1000 or 1001, clean disconnect; else retry
      if (event.code === 1000 || event.code === 1001) {
        dispatch({ type: 'DISCONNECTED' });
        return;
      }
      // Retry with exponential backoff using stable ref to avoid circular dependency
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        const delay = RETRY_BASE_MS * Math.pow(2, retryCountRef.current - 1);
        dispatch({ type: 'RECONNECTING', retryCount: retryCountRef.current });
        retryTimerRef.current = setTimeout(() => {
          connectWsRef.current();
        }, delay);
      } else {
        dispatch({ type: 'ERROR' });
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, let onclose handle the retry
    };
  }, []); // no deps — all state is via refs or stable dispatch

  // Keep the ref in sync with the latest connectWs — must happen in an effect, not during render
  useEffect(() => {
    connectWsRef.current = connectWs;
  });

  const disconnect = useCallback(() => {
    clearRetryTimer();
    retryCountRef.current = 0;
    manualCloseRef.current = true;
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    dispatch({ type: 'DISCONNECTED' });
  }, [clearRetryTimer]);

  // Auto-connect on mount
  useEffect(() => {
    connectWs();
    return () => {
      clearRetryTimer();
      manualCloseRef.current = true;
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
    };
  }, [connectWs, clearRetryTimer]);

  return {
    connectionState: state.connectionState,
    deviceStates: state.deviceStates,
    recentEvents: state.recentEvents,
    connect: connectWs,
    disconnect,
  };
}
