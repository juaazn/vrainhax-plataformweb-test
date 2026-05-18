import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessions } from './use-sessions';
import type { SessionDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  sessionsApi: {
    list: vi.fn(),
  },
}));

import { sessionsApi } from '@/lib/api';

const mockSessions: SessionDTO[] = [
  {
    session_id: 's1-1111-2222-3333-444444444444',
    patient_id: 'p1-1111-2222-3333-444444444444',
    therapist_id: null,
    device_id: null,
    variant_id: 'v1',
    status: 'completed',
    started_at: '2024-01-01T10:00:00Z',
    ended_at: '2024-01-01T10:30:00Z',
    difficulty: null,
    score_value: null,
    completed: true,
    pain_before: null,
    pain_after: null,
    config: {},
    metrics: {},
    created_at: '2024-01-01T09:00:00Z',
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useSessions', () => {
  it('returns session list on happy path', async () => {
    vi.mocked(sessionsApi.list).mockResolvedValue(mockSessions);

    const { result } = renderHook(() => useSessions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.error).toBeNull();
    expect(sessionsApi.list).toHaveBeenCalledTimes(1);
  });

  it('returns error on API failure', async () => {
    const apiError = new Error('Network error');
    vi.mocked(sessionsApi.list).mockRejectedValue(apiError);

    const { result } = renderHook(() => useSessions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toEqual([]);
    expect(result.current.error).toBe(apiError);
  });

  it('reload() triggers a new fetch', async () => {
    vi.mocked(sessionsApi.list).mockResolvedValue(mockSessions);

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const moreSessions = [...mockSessions, { ...mockSessions[0], session_id: 's2' }];
    vi.mocked(sessionsApi.list).mockResolvedValue(moreSessions);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(2));
    expect(sessionsApi.list).toHaveBeenCalledTimes(2);
  });

  it('passes status filter to sessionsApi.list', async () => {
    const completedSessions = mockSessions.filter((s) => s.status === 'completed');
    vi.mocked(sessionsApi.list).mockResolvedValue(completedSessions);

    const { result } = renderHook(() => useSessions({ status: 'completed' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(sessionsApi.list).toHaveBeenCalledWith({ status: 'completed' });
    expect(result.current.sessions).toEqual(completedSessions);
  });
});
