import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDevices } from './use-devices';
import type { DeviceDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  devicesApi: {
    list: vi.fn(),
  },
}));

import { devicesApi } from '@/lib/api';

const mockDevices: DeviceDTO[] = [
  {
    device_id: 'd1',
    device_name: 'Sensor A',
    device_type: 'imu',
    serial_number: 'SN-001',
    active: true,
    firmware_version: null,
    notes: null,
    registered_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
    last_seen_at: null,
    last_connected_at: null,
    last_authenticated_at: null,
    device_secret_last_rotated_at: null,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useDevices', () => {
  it('returns device list on happy path', async () => {
    vi.mocked(devicesApi.list).mockResolvedValue(mockDevices);

    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.devices).toEqual(mockDevices);
    expect(result.current.error).toBeNull();
    expect(devicesApi.list).toHaveBeenCalledWith({ active: true });
  });

  it('returns error on API failure', async () => {
    const apiError = new Error('Network error');
    vi.mocked(devicesApi.list).mockRejectedValue(apiError);

    const { result } = renderHook(() => useDevices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.devices).toEqual([]);
    expect(result.current.error).toBe(apiError);
  });

  it('reload() triggers a new fetch', async () => {
    vi.mocked(devicesApi.list).mockResolvedValue(mockDevices);

    const { result } = renderHook(() => useDevices());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const moreDevices = [...mockDevices, { ...mockDevices[0], device_id: 'd2', serial_number: 'SN-002' }];
    vi.mocked(devicesApi.list).mockResolvedValue(moreDevices);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.devices).toHaveLength(2));
    expect(devicesApi.list).toHaveBeenCalledTimes(2);
  });
});
