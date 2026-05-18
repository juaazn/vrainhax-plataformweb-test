export interface PatientVariantSettingsDTO {
  patient_id: string;
  variant_id: string;
  config: Record<string, unknown>;
}

export interface PatientVariantSettingsPutPayload {
  config: Record<string, unknown>;
}
