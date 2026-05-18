import { apiClient } from './client';
import type { PlatformUserDTO, UserCreatePayload, UserPatchPayload, UserListParams } from '@/types/api';

export const usersApi = {
  list(params?: UserListParams): Promise<PlatformUserDTO[]> {
    return apiClient.get<PlatformUserDTO[]>('/api/v1/users', params as Record<string, unknown>);
  },
  getById(userId: string): Promise<PlatformUserDTO> {
    return apiClient.get<PlatformUserDTO>(`/api/v1/users/${userId}`);
  },
  create(payload: UserCreatePayload): Promise<PlatformUserDTO> {
    return apiClient.post<PlatformUserDTO>('/api/v1/users', payload);
  },
  patch(userId: string, payload: UserPatchPayload): Promise<PlatformUserDTO> {
    return apiClient.patch<PlatformUserDTO>(`/api/v1/users/${userId}`, payload);
  },
  deactivate(userId: string): Promise<PlatformUserDTO> {
    return apiClient.patch<PlatformUserDTO>(`/api/v1/users/${userId}/deactivate`);
  },
};
