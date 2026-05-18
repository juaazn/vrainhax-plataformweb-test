import { apiClient } from './client';
import type { PatientVariantSettingsDTO, PatientVariantSettingsPutPayload } from '@/types/api';

export const patientVariantSettingsApi = {
  get(patientId: string, variantId: string): Promise<PatientVariantSettingsDTO> {
    return apiClient.get<PatientVariantSettingsDTO>(
      `/api/v1/patients/${patientId}/variant-settings/${variantId}`,
    );
  },
  put(
    patientId: string,
    variantId: string,
    payload: PatientVariantSettingsPutPayload,
  ): Promise<PatientVariantSettingsDTO> {
    return apiClient.put<PatientVariantSettingsDTO>(
      `/api/v1/patients/${patientId}/variant-settings/${variantId}`,
      payload,
    );
  },
};
