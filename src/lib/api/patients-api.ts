import { apiClient } from './client';
import type {
  PatientDTO,
  PatientCreatePayload,
  PatientPatchPayload,
  PatientListParams,
} from '@/types/api';

export const patientsApi = {
  list(params?: PatientListParams): Promise<PatientDTO[]> {
    return apiClient.get<PatientDTO[]>('/api/v1/patients', params as Record<string, unknown>);
  },
  getById(patientId: string): Promise<PatientDTO> {
    return apiClient.get<PatientDTO>(`/api/v1/patients/${patientId}`);
  },
  create(payload: PatientCreatePayload): Promise<PatientDTO> {
    return apiClient.post<PatientDTO>('/api/v1/patients', payload);
  },
  patch(patientId: string, payload: PatientPatchPayload): Promise<PatientDTO> {
    return apiClient.patch<PatientDTO>(`/api/v1/patients/${patientId}`, payload);
  },
  deactivate(patientId: string): Promise<PatientDTO> {
    return patientsApi.patch(patientId, { active: false });
  },
  reactivate(patientId: string): Promise<PatientDTO> {
    return patientsApi.patch(patientId, { active: true });
  },
};
