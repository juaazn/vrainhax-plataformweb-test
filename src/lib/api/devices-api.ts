import { apiClient } from './client';
import type {
  DeviceDTO,
  DeviceCreatePayload,
  DeviceCreateResponse,
  DeviceUpdatePayload,
  DeviceListParams,
  RotateSecretResponse,
} from '@/types/api';

export const devicesApi = {
  list(params?: DeviceListParams): Promise<DeviceDTO[]> {
    return apiClient.get<DeviceDTO[]>('/api/v1/devices', params as Record<string, unknown>);
  },
  getById(deviceId: string): Promise<DeviceDTO> {
    return apiClient.get<DeviceDTO>(`/api/v1/devices/${deviceId}`);
  },
  create(payload: DeviceCreatePayload): Promise<DeviceCreateResponse> {
    return apiClient.post<DeviceCreateResponse>('/api/v1/devices', payload);
  },
  update(deviceId: string, payload: DeviceUpdatePayload): Promise<DeviceDTO> {
    return apiClient.patch<DeviceDTO>(`/api/v1/devices/${deviceId}`, payload);
  },
  deactivate(deviceId: string): Promise<DeviceDTO> {
    return apiClient.patch<DeviceDTO>(`/api/v1/devices/${deviceId}/deactivate`, {});
  },
  reactivate(deviceId: string): Promise<DeviceDTO> {
    return apiClient.patch<DeviceDTO>(`/api/v1/devices/${deviceId}/reactivate`, {});
  },
  rotateSecret(deviceId: string): Promise<RotateSecretResponse> {
    return apiClient.post<RotateSecretResponse>(`/api/v1/devices/${deviceId}/rotate-secret`);
  },
  /** @deprecated Use update() */
  patch(deviceId: string, payload: DeviceUpdatePayload): Promise<DeviceDTO> {
    return devicesApi.update(deviceId, payload);
  },
};
