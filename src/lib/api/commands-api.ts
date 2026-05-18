import { apiClient, ApiError, BASE_URL } from './client';
import type {
  CommandListResponse,
  CommandSendPayload,
  CommandSendResponse,
  CommandListParams,
} from '@/types/api';

/** Fetches GET /api/v1/commands and returns the full paginated response.
 *  The backend returns { data: [...], pagination: {...} } directly
 *  (not wrapped in an extra envelope), so we bypass apiClient.get.
 */
async function fetchCommandList(params?: CommandListParams): Promise<CommandListResponse> {
  const url = new URL('/api/v1/commands', BASE_URL);
  if (params) {
    const entries: Array<[string, string]> = [];
    if (params.deviceId !== undefined) entries.push(['deviceId', params.deviceId]);
    if (params.sessionId !== undefined) entries.push(['sessionId', params.sessionId]);
    if (params.status !== undefined) entries.push(['status', params.status]);
    if (params.commandName !== undefined) entries.push(['commandName', params.commandName]);
    if (params.dateFrom !== undefined) entries.push(['dateFrom', params.dateFrom]);
    if (params.dateTo !== undefined) entries.push(['dateTo', params.dateTo]);
    if (params.issuedByUserId !== undefined) entries.push(['issuedByUserId', params.issuedByUserId]);
    if (params.page !== undefined) entries.push(['page', String(params.page)]);
    if (params.limit !== undefined) entries.push(['limit', String(params.limit)]);
    entries.forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    let code = 'API_ERROR';
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      code = body.error ?? code;
      message = body.message ?? message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, code, message);
  }
  return res.json() as Promise<CommandListResponse>;
}

export const commandsApi = {
  /** Envía un comando VR tipado al backend. El backend valida, persiste y forwarded al dispositivo vía WS. */
  send(payload: CommandSendPayload): Promise<CommandSendResponse> {
    return apiClient.post<CommandSendResponse>('/api/v1/commands', payload);
  },

  recenterView(deviceId: string, sessionId?: string): Promise<CommandSendResponse> {
    return commandsApi.send({
      type: 'command.recenter_view',
      device_id: deviceId,
      ...(sessionId ? { session_id: sessionId } : {}),
    });
  },

  startSession(
    deviceId: string,
    sessionId?: string,
    payload?: { variantId?: string; difficulty?: number; config?: Record<string, unknown> },
  ): Promise<CommandSendResponse> {
    return commandsApi.send({
      type: 'command.start_session',
      device_id: deviceId,
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(payload ? { payload } : {}),
    });
  },

  pauseSession(deviceId: string, sessionId?: string): Promise<CommandSendResponse> {
    return commandsApi.send({
      type: 'command.pause_session',
      device_id: deviceId,
      ...(sessionId ? { session_id: sessionId } : {}),
    });
  },

  resumeSession(deviceId: string, sessionId?: string): Promise<CommandSendResponse> {
    return commandsApi.send({
      type: 'command.resume_session',
      device_id: deviceId,
      ...(sessionId ? { session_id: sessionId } : {}),
    });
  },

  endSession(
    deviceId: string,
    sessionId?: string,
    payload?: { status?: 'completed' | 'aborted' | 'cancelled' },
  ): Promise<CommandSendResponse> {
    return commandsApi.send({
      type: 'command.end_session',
      device_id: deviceId,
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(payload ? { payload } : {}),
    });
  },

  updateConfig(
    deviceId: string,
    config: Record<string, unknown>,
    sessionId?: string,
  ): Promise<CommandSendResponse> {
    return commandsApi.send({
      type: 'command.update_config',
      device_id: deviceId,
      payload: { config },
      ...(sessionId ? { session_id: sessionId } : {}),
    });
  },

  listCommands(params?: CommandListParams): Promise<CommandListResponse> {
    return fetchCommandList(params);
  },
};
