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

export interface SessionProgressItemDTO {
  session_id: string;
  status: string;
  module_id: string | null;
  module_name: string | null;
  variant_id: string | null;
  variant_name: string | null;
  device_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  elapsed_seconds: number | null;
  score_value: number | null;
  difficulty: number | null;
  pain_before: number | null;
  pain_after: number | null;
  has_metrics: boolean;
  command_counts: {
    total: number;
    delivered: number;
    failed: number;
    timeout: number;
  };
}

export interface PatientProgressTotals {
  total_sessions: number;
  pending_sessions: number;
  running_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  total_elapsed_seconds: number;
  total_commands: number;
  delivered_commands: number;
  failed_commands: number;
  timeout_commands: number;
  sessions_with_metrics: number;
}

export interface ScorePoint {
  session_id: string;
  timestamp: string;
  value: number;
}

export interface ElapsedPoint {
  session_id: string;
  timestamp: string;
  value: number;
}

export interface PainPoint {
  session_id: string;
  timestamp: string;
  before: number;
  after: number;
}

export interface PatientProgressSeries {
  score_over_time: ScorePoint[];
  elapsed_seconds_over_time: ElapsedPoint[];
  pain_before_after: PainPoint[];
}

export interface PatientProgressFilters {
  date_from: string | null;
  date_to: string | null;
  module_id: string | null;
  variant_id: string | null;
  status: string | null;
  limit: number;
}

export interface PatientProgressSummary {
  patient_id: string;
  full_name: string;
  active: boolean;
}

export interface PatientProgressDTO {
  patient: PatientProgressSummary;
  filters: PatientProgressFilters;
  totals: PatientProgressTotals;
  sessions: SessionProgressItemDTO[];
  series: PatientProgressSeries;
  warnings: string[];
}

export interface PatientProgressListParams {
  date_from?: string;
  date_to?: string;
  module_id?: string;
  variant_id?: string;
  status?: string;
  limit?: number;
}
