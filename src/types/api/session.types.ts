export type SessionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'aborted'
  | 'failed'
  | 'cancelled';

export interface SessionDTO {
  session_id: string;
  patient_id: string;
  therapist_id: string | null;
  device_id: string | null;
  variant_id: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  difficulty: number | null;
  score_value: number | null;
  completed: boolean;
  pain_before: number | null;
  pain_after: number | null;
  config: Record<string, unknown>;
  metrics: Record<string, unknown>;
  created_at: string;
}

export interface RealtimeInfoDTO {
  enabled: boolean;
  wsPath: string;
  devicesPath: string;
  clientsPath: string;
}

export interface SessionActivatePayload {
  patientId: string;
  variantId: string;
  deviceId?: string;
  difficulty?: number;
  painBefore?: number;
  config?: Record<string, unknown>;
}

export interface SessionFinishPayload {
  status?: 'completed' | 'aborted' | 'failed' | 'cancelled';
  scoreValue?: number;
  painAfter?: number;
  metrics?: Record<string, unknown>;
}

export interface SessionActivateResponse {
  session: SessionDTO;
}

export interface SessionFinishResponse {
  session: SessionDTO;
  realtime: RealtimeInfoDTO;
}

export interface SessionStartResponse {
  session: SessionDTO;
  realtime: RealtimeInfoDTO;
}

export interface SessionCompletePayload {
  scoreValue?: number;
  painAfter?: number;
  metrics?: Record<string, unknown>;
}

export interface SessionCancelPayload {
  reason?: string;
}

export interface SessionListParams {
  patientId?: string;
  deviceId?: string;
  status?: SessionStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface AssignDevicePayload {
  device_id: string;
}

export interface SessionDetailDTO extends SessionDTO {
  patient: { first_name: string; last_name: string } | null;
  device: { name: string; serial_number: string } | null;
  variant?: { name: string; variant_code: string } | null;
}

export interface SessionEventDTO {
  event_id: string;
  session_id: string;
  device_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface SessionEventListResponse {
  data: SessionEventDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SessionEventListParams {
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface TimelineItemDTO {
  timeline_id: string;
  kind: 'command' | 'event';
  timestamp: string;
  title: string;
  status: string | null;
  device_id: string | null;
  session_id: string;
  patient_id: string | null;
  summary: string;
  details: Record<string, unknown>;
  error_message: string | null;
}

export interface TimelineListResponse {
  data: TimelineItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TimelineListParams {
  type?: 'command' | 'event' | 'all';
  status?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SessionReportSection {
  title: string;
  items: string[];
}

export interface SessionReportDTO {
  report_id: string;
  session_id: string;
  generated_at: string;
  patient: { patient_id: string; first_name: string; last_name: string };
  therapist: { user_id: string; name?: string; email?: string };
  device?: { device_id: string; device_name: string; serial_number?: string };
  session: { status: string; started_at?: string; ended_at?: string; duration_seconds?: number };
  summary: {
    total_events: number;
    total_metrics: number;
    total_commands: number;
    delivered_commands: number;
    failed_commands: number;
    timeout_commands: number;
    last_score?: number;
    total_repetitions?: number;
    elapsed_seconds?: number;
    highlights: string[];
    warnings: string[];
  };
  timeline: TimelineItemDTO[];
  sections: SessionReportSection[];
}

export interface SessionSummaryDTO {
  session_id: string;
  patient: { patient_id: string; first_name: string; last_name: string };
  therapist: { user_id: string; name?: string; email?: string };
  device?: { device_id: string; device_name: string; serial_number?: string };
  status: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  metrics: {
    total_events: number;
    total_metrics: number;
    total_commands: number;
    delivered_commands: number;
    failed_commands: number;
    timeout_commands: number;
    last_score?: number;
    total_repetitions?: number;
    elapsed_seconds?: number;
  };
  highlights: string[];
  warnings: string[];
  generated_at: string;
}
