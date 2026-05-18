export interface DeviceDTO {
  device_id: string;
  device_name: string;
  device_type: string;
  serial_number: string;
  active: boolean;
  firmware_version: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  last_seen_at: string | null;
  last_connected_at: string | null;
  last_authenticated_at: string | null;
  registered_by: string | null;
  device_secret_last_rotated_at: string | null;
}

export type RotateSecretResponse = {
  device_secret: string;
};

export type DeviceCreateResponse = DeviceDTO & { device_secret: string };

export interface DeviceCreatePayload {
  device_name: string;
  device_type: string;
  serial_number: string;
  firmware_version?: string;
  notes?: string;
}

export type DeviceUpdatePayload = Partial<Pick<DeviceCreatePayload, 'device_name' | 'device_type' | 'serial_number' | 'firmware_version' | 'notes'>>;

/** @deprecated Use DeviceUpdatePayload */
export type DevicePatchPayload = DeviceUpdatePayload;

export interface DeviceListParams {
  active?: boolean;
  type?: string;
}
