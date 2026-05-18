import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePatient } from './use-patient';
import { ApiError } from '@/lib/api';
import type { PatientDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  patientsApi: {
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

import { patientsApi } from '@/lib/api';

const mockPatient: PatientDTO = {
  patient_id: 'p1',
  user_id: null,
  first_name: 'Ana',
  last_name: 'Lopez',
  birth_date: '1990-05-15',
  gender: 'Female',
  contact_email: 'ana@example.com',
  description: 'Test patient',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deactivated_at: null,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('usePatient', () => {
  it('returns patient data on happy path', async () => {
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatient);

    const { result } = renderHook(() => usePatient('p1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.patient).toEqual(mockPatient);
    expect(result.current.error).toBeNull();
    expect(patientsApi.getById).toHaveBeenCalledWith('p1');
  });

  it('returns error on 404', async () => {
    const notFoundError = new ApiError(404, 'NOT_FOUND', 'Patient not found');
    vi.mocked(patientsApi.getById).mockRejectedValue(notFoundError);

    const { result } = renderHook(() => usePatient('unknown'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.patient).toBeNull();
    expect(result.current.error).toBe(notFoundError);
    expect(result.current.error?.message).toBe('Patient not found');
  });

  it('reload() triggers a new fetch', async () => {
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatient);

    const { result } = renderHook(() => usePatient('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatedPatient = { ...mockPatient, first_name: 'Ana Updated' };
    vi.mocked(patientsApi.getById).mockResolvedValue(updatedPatient);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.patient?.first_name).toBe('Ana Updated'));
    expect(patientsApi.getById).toHaveBeenCalledTimes(2);
  });
});
