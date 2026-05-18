export type DeviceStatus = "connected" | "disconnected";

export type DeviceItem = {
  deviceId: string;
  status: DeviceStatus;
  lastHeartbeat?: string;
  battery?: number;
  currentSession?: string;
  payload?: unknown;
};
