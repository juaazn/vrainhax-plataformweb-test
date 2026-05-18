export interface PatientDTO {
  patient_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  contact_email: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
}

export interface PatientCreatePayload {
  first_name: string;
  last_name: string;
  birth_date?: string;
  gender?: string;
  contact_email?: string;
  description?: string;
}

export type PatientPatchPayload = Partial<PatientCreatePayload & { active: boolean }>;

export interface PatientListParams {
  active?: boolean;
}
