import { apiClient, ApiError, BASE_URL } from './client';
import type {
  SessionDTO,
  SessionDetailDTO,
  SessionActivatePayload,
  SessionFinishPayload,
  SessionActivateResponse,
  SessionFinishResponse,
  SessionStartResponse,
  SessionCompletePayload,
  SessionCancelPayload,
  SessionListParams,
  SessionEventListResponse,
  SessionEventListParams,
  TimelineListResponse,
  TimelineListParams,
  SessionSummaryDTO,
  SessionReportDTO,
} from '@/types/api';

async function fetchTimelineList(
  sessionId: string,
  params?: TimelineListParams,
): Promise<TimelineListResponse> {
  const url = new URL(`/api/v1/sessions/${sessionId}/timeline`, BASE_URL);
  if (params) {
    if (params.type !== undefined) url.searchParams.set('type', params.type);
    if (params.status !== undefined) url.searchParams.set('status', params.status);
    if (params.eventType !== undefined) url.searchParams.set('eventType', params.eventType);
    if (params.dateFrom !== undefined) url.searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo !== undefined) url.searchParams.set('dateTo', params.dateTo);
    if (params.order !== undefined) url.searchParams.set('order', params.order);
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
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
  return res.json() as Promise<TimelineListResponse>;
}

async function fetchSessionEventList(
  sessionId: string,
  params?: SessionEventListParams,
): Promise<SessionEventListResponse> {
  const url = new URL(`/api/v1/sessions/${sessionId}/events`, BASE_URL);
  if (params) {
    if (params.eventType !== undefined) url.searchParams.set('eventType', params.eventType);
    if (params.dateFrom !== undefined) url.searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo !== undefined) url.searchParams.set('dateTo', params.dateTo);
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
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
  return res.json() as Promise<SessionEventListResponse>;
}

export const sessionsApi = {
  list(params?: SessionListParams): Promise<SessionDTO[]> {
    return apiClient.get<SessionDTO[]>('/api/v1/sessions', params as Record<string, unknown>);
  },
  getById(sessionId: string): Promise<SessionDetailDTO> {
    return apiClient.get<SessionDetailDTO>(`/api/v1/sessions/${sessionId}`);
  },
  activate(payload: SessionActivatePayload): Promise<SessionActivateResponse> {
    return apiClient.post<SessionActivateResponse>('/api/v1/sessions/activate', payload);
  },
  finish(sessionId: string, payload?: SessionFinishPayload): Promise<SessionFinishResponse> {
    return apiClient.post<SessionFinishResponse>(
      `/api/v1/sessions/${sessionId}/finish`,
      payload,
    );
  },
  start(sessionId: string): Promise<SessionStartResponse> {
    return apiClient.post<SessionStartResponse>(`/api/v1/sessions/${sessionId}/start`);
  },
  complete(sessionId: string, payload?: SessionCompletePayload): Promise<SessionFinishResponse> {
    return apiClient.post<SessionFinishResponse>(
      `/api/v1/sessions/${sessionId}/finish`,
      payload,
    );
  },
  cancel(sessionId: string, payload?: SessionCancelPayload): Promise<{ session: SessionDTO }> {
    return apiClient.post<{ session: SessionDTO }>(
      `/api/v1/sessions/${sessionId}/cancel`,
      payload,
    );
  },
  assignDevice(sessionId: string, deviceId: string): Promise<SessionDetailDTO> {
    return apiClient.patch<SessionDetailDTO>(`/api/v1/sessions/${sessionId}/device`, { device_id: deviceId });
  },
  listEvents(sessionId: string, params?: SessionEventListParams): Promise<SessionEventListResponse> {
    return fetchSessionEventList(sessionId, params);
  },
  listTimeline(sessionId: string, params?: TimelineListParams): Promise<TimelineListResponse> {
    return fetchTimelineList(sessionId, params);
  },
  getSummary(sessionId: string): Promise<SessionSummaryDTO> {
    return apiClient.get<SessionSummaryDTO>(`/api/v1/sessions/${sessionId}/summary`);
  },
  getReport(sessionId: string): Promise<SessionReportDTO> {
    return apiClient.get<SessionReportDTO>(`/api/v1/sessions/${sessionId}/report`);
  },
};
