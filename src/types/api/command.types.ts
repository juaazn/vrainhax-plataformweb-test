export type CommandType =
  | 'command.recenter_view'
  | 'command.start_session'
  | 'command.pause_session'
  | 'command.resume_session'
  | 'command.end_session'
  | 'command.update_config';

export type CommandStatus = 'sent' | 'delivered' | 'executed' | 'failed' | 'timeout' | 'queued';

// Respuesta del POST /commands (19B)
export interface CommandSendResponse {
  command_id: string;
  type: CommandType;
  device_id: string;
  session_id: string | null;
  status: 'queued' | 'sent';
  delivered_via_ws: boolean;
  created_at: string;
}

// Registro del GET /commands — Feature #21: nuevo contrato paginado
export interface CommandDTO {
  command_id: string;
  command_name: string;
  status: CommandStatus;
  device_id: string;
  issued_by_user_id: string | null;
  sent_at: string;
  executed_at: string | null;
  error_message: string | null;
}

export interface CommandListResponse {
  data: CommandDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommandSendPayload {
  type: CommandType;
  device_id: string;
  session_id?: string;
  payload?: Record<string, unknown>;
}

export interface CommandListParams {
  deviceId?: string;
  sessionId?: string;
  status?: CommandStatus;
  commandName?: string;
  dateFrom?: string;
  dateTo?: string;
  issuedByUserId?: string;
  page?: number;
  limit?: number;
}
