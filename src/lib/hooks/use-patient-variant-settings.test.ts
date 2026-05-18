import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePatientVariantSettings } from './use-patient-variant-settings';
import type { PatientVariantSettingsDTO } from '@/types/api';

vi.mock('@/lib/api', () => ({
  patientVariantSettingsApi: {
    get: vi.fn(),
  },
}));

import { patientVariantSettingsApi } from '@/lib/api';

const mockSettings: PatientVariantSettingsDTO = {
  patient_id: 'patient-1',
  variant_id: 'variant-1',
  config: { difficulty: 3, duration: 60 },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('usePatientVariantSettings', () => {
  it('returns initial state with nulls when both ids are null', () => {
    const { result } = renderHook(() => usePatientVariantSettings(null, null));

    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(patientVariantSettingsApi.get).not.toHaveBeenCalled();
  });

  it('does not call API when patientId is null', () => {
    renderHook(() => usePatientVariantSettings(null, 'variant-1'));

    expect(patientVariantSettingsApi.get).not.toHaveBeenCalled();
  });

  it('does not call API when variantId is null', () => {
    renderHook(() => usePatientVariantSettings('patient-1', null));

    expect(patientVariantSettingsApi.get).not.toHaveBeenCalled();
  });

  it('calls API and returns settings when both ids are provided', async () => {
    vi.mocked(patientVariantSettingsApi.get).mockResolvedValue(mockSettings);

    const { result } = renderHook(() =>
      usePatientVariantSettings('patient-1', 'variant-1'),
    );

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(patientVariantSettingsApi.get).toHaveBeenCalledWith('patient-1', 'variant-1');
    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.error).toBeNull();
  });

  it('handles API error and returns error state', async () => {
    const apiError = new Error('Not found');
    vi.mocked(patientVariantSettingsApi.get).mockRejectedValue(apiError);

    const { result } = renderHook(() =>
      usePatientVariantSettings('patient-1', 'variant-1'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBe(apiError);
  });

  it('wraps non-Error rejections in an Error', async () => {
    vi.mocked(patientVariantSettingsApi.get).mockRejectedValue('string error');

    const { result } = renderHook(() =>
      usePatientVariantSettings('patient-1', 'variant-1'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('resets state when patientId becomes null', async () => {
    vi.mocked(patientVariantSettingsApi.get).mockResolvedValue(mockSettings);

    type Props = { pId: string | null; vId: string | null };
    const { result, rerender } = renderHook(
      ({ pId, vId }: Props) => usePatientVariantSettings(pId, vId),
      { initialProps: { pId: 'patient-1', vId: 'variant-1' } as Props },
    );

    await waitFor(() => expect(result.current.settings).toEqual(mockSettings));

    rerender({ pId: null, vId: 'variant-1' });

    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('resets state when variantId becomes null', async () => {
    vi.mocked(patientVariantSettingsApi.get).mockResolvedValue(mockSettings);

    type Props = { pId: string | null; vId: string | null };
    const { result, rerender } = renderHook(
      ({ pId, vId }: Props) => usePatientVariantSettings(pId, vId),
      { initialProps: { pId: 'patient-1', vId: 'variant-1' } as Props },
    );

    await waitFor(() => expect(result.current.settings).toEqual(mockSettings));

    rerender({ pId: 'patient-1', vId: null });

    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches new data when ids change', async () => {
    const secondSettings: PatientVariantSettingsDTO = {
      patient_id: 'patient-2',
      variant_id: 'variant-2',
      config: { difficulty: 7 },
    };

    vi.mocked(patientVariantSettingsApi.get)
      .mockResolvedValueOnce(mockSettings)
      .mockResolvedValueOnce(secondSettings);

    type Props = { pId: string | null; vId: string | null };
    const { result, rerender } = renderHook(
      ({ pId, vId }: Props) => usePatientVariantSettings(pId, vId),
      { initialProps: { pId: 'patient-1', vId: 'variant-1' } as Props },
    );

    await waitFor(() => expect(result.current.settings).toEqual(mockSettings));

    rerender({ pId: 'patient-2', vId: 'variant-2' });

    await waitFor(() => expect(result.current.settings).toEqual(secondSettings));

    expect(patientVariantSettingsApi.get).toHaveBeenCalledTimes(2);
    expect(patientVariantSettingsApi.get).toHaveBeenNthCalledWith(2, 'patient-2', 'variant-2');
  });
});
