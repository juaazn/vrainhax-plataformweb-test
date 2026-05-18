import { apiClient } from './client';
import type { ModuleDTO, ModuleListParams, VariantSummaryDTO } from '@/types/api';

export const modulesApi = {
  list(params?: ModuleListParams): Promise<ModuleDTO[]> {
    return apiClient.get<ModuleDTO[]>('/api/v1/modules', params as Record<string, unknown>);
  },
  listVariants(moduleId: string, params?: { active?: boolean }): Promise<VariantSummaryDTO[]> {
    return apiClient.get<VariantSummaryDTO[]>(
      `/api/v1/modules/${moduleId}/variants`,
      params as Record<string, unknown>,
    );
  },
};
