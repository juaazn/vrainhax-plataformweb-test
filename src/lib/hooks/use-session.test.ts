import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSession } from './use-session';
import { ApiError } from '@/lib/api';
import type { SessionDetailDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  sessionsApi: {
    getById: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
    }
  },
}));

import { sessionsApi } from '@/lib/api';

const mockSession: SessionDetailDTO = {
  session_id: 's1-1111-2222-3333-444444444444',
  patient_id: 'p1-1111-2222-3333-444444444444',
  therapist_id: null,
  device_id: null,
  variant_id: 'v1-1111-2222-3333-444444444444',
  status: 'completed',
  started_at: '2024-01-01T10:00:00Z',
  ended_at: '2024-01-01T10:30:00Z',
  difficulty: 3,
  score_value: 85,
  completed: true,
  pain_before: 5,
  pain_after: 2,
  config: {},
  metrics: { steps: 120 },
  created_at: '2024-01-01T09:00:00Z',
  patient: { first_name: 'Ana', last_name: 'Lopez' },
  device: { name: 'VR Headset A', serial_number: 'SN-001' },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useSession', () => {
  it('returns session data on happy path', async () => {
    vi.mocked(sessionsApi.getById).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useSession('s1-1111-2222-3333-444444444444'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.error).toBeNull();
    expect(sessionsApi.getById).toHaveBeenCalledWith('s1-1111-2222-3333-444444444444');
  });

  it('returns error with status 404 when session is not found', async () => {
    const notFoundError = new ApiError(404, 'NOT_FOUND', 'Session not found');
    vi.mocked(sessionsApi.getById).mockRejectedValue(notFoundError);

    const { result } = renderHook(() => useSession('unknown-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe(notFoundError);
    expect((result.current.error as ApiError).status).toBe(404);
  });

  it('reload() triggers a new API call', async () => {
    vi.mocked(sessionsApi.getById).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useSession('s1-1111-2222-3333-444444444444'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatedSession = { ...mockSession, score_value: 99 };
    vi.mocked(sessionsApi.getById).mockResolvedValue(updatedSession);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.session?.score_value).toBe(99));
    expect(sessionsApi.getById).toHaveBeenCalledTimes(2);
  });
});
