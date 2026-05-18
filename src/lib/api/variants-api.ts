import { apiClient } from './client';
import type { VariantSchemaDTO, VariantCommandDTO } from '@/types/api';

export const variantsApi = {
  getSchema(variantId: string): Promise<VariantSchemaDTO> {
    return apiClient.get<VariantSchemaDTO>(`/api/v1/variants/${variantId}`);
  },
  listCommands(variantId: string): Promise<VariantCommandDTO[]> {
    return apiClient.get<VariantCommandDTO[]>(`/api/v1/variants/${variantId}/commands`);
  },
};
