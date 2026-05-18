import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePatients } from './use-patients';
import type { PatientDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  patientsApi: {
    list: vi.fn(),
  },
}));

import { patientsApi } from '@/lib/api';

const mockPatients: PatientDTO[] = [
  {
    patient_id: 'p1',
    user_id: null,
    first_name: 'Ana',
    last_name: 'Lopez',
    birth_date: null,
    gender: null,
    contact_email: null,
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deactivated_at: null,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('usePatients', () => {
  it('returns patient list on happy path', async () => {
    vi.mocked(patientsApi.list).mockResolvedValue(mockPatients);

    const { result } = renderHook(() => usePatients());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.patients).toEqual(mockPatients);
    expect(result.current.error).toBeNull();
    expect(patientsApi.list).toHaveBeenCalledWith({ active: true });
  });

  it('returns error on API failure', async () => {
    const apiError = new Error('Network error');
    vi.mocked(patientsApi.list).mockRejectedValue(apiError);

    const { result } = renderHook(() => usePatients());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.patients).toEqual([]);
    expect(result.current.error).toBe(apiError);
  });

  it('reload() triggers a new fetch', async () => {
    vi.mocked(patientsApi.list).mockResolvedValue(mockPatients);

    const { result } = renderHook(() => usePatients());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const morePatients = [...mockPatients, { ...mockPatients[0], patient_id: 'p2', first_name: 'Carlos' }];
    vi.mocked(patientsApi.list).mockResolvedValue(morePatients);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.patients).toHaveLength(2));
    expect(patientsApi.list).toHaveBeenCalledTimes(2);
  });
});
