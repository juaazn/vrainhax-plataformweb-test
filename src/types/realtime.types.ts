export type ClientEventType =
  | 'device.hello'
  | 'device.heartbeat'
  | 'device.connected'
  | 'device.disconnected'
  | 'device.status.updated'
  | 'session.started'
  | 'session.metric.received'
  | 'session.ended';

export type RealtimeConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'unavailable' // 503: no active sessions
  | 'error';

export interface DeviceRealtimeState {
  deviceId: string;
  connectionStatus: 'connected' | 'disconnected' | 'busy';
  lastSeenAt: string | null;
  deviceName?: string;
  deviceType?: string;
  sessionId?: string;
  sessionActive?: boolean;
  batteryLevel?: number | null;
  scene?: string;
}

export interface ClientRealtimeEvent {
  schemaVersion: string;
  eventType: ClientEventType;
  occurredAt: string;
  deviceId: string;
  sessionId?: string;
  scene?: string;
  summary: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}

export interface ServerSnapshot {
  schemaVersion: string;
  eventType: 'server.snapshot';
  occurredAt: string;
  devices: DeviceRealtimeState[];
}
