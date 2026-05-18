import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patientVariantSettingsApi } from './patient-variant-settings-api';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

const getMock = vi.mocked(apiClient.get);
const putMock = vi.mocked(apiClient.put);

const fakeSettings = {
  patient_id: 'patient-1',
  variant_id: 'variant-1',
  config: { difficulty: 3, duration: 60 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('patientVariantSettingsApi', () => {
  it('get() calls GET /api/v1/patients/:patientId/variant-settings/:variantId', async () => {
    getMock.mockResolvedValue(fakeSettings);

    const result = await patientVariantSettingsApi.get('patient-1', 'variant-1');

    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/patients/patient-1/variant-settings/variant-1',
    );
    expect(result).toEqual(fakeSettings);
  });

  it('get() constructs URL with different ids correctly', async () => {
    getMock.mockResolvedValue({ ...fakeSettings, patient_id: 'p-abc', variant_id: 'v-xyz' });

    await patientVariantSettingsApi.get('p-abc', 'v-xyz');

    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/patients/p-abc/variant-settings/v-xyz',
    );
  });

  it('put() calls PUT /api/v1/patients/:patientId/variant-settings/:variantId with payload', async () => {
    const payload = { config: { difficulty: 5, duration: 90 } };
    putMock.mockResolvedValue({ ...fakeSettings, config: payload.config });

    const result = await patientVariantSettingsApi.put('patient-1', 'variant-1', payload);

    expect(putMock).toHaveBeenCalledWith(
      '/api/v1/patients/patient-1/variant-settings/variant-1',
      payload,
    );
    expect(result).toEqual({ ...fakeSettings, config: payload.config });
  });

  it('put() passes empty config object correctly', async () => {
    const payload = { config: {} };
    putMock.mockResolvedValue({ ...fakeSettings, config: {} });

    await patientVariantSettingsApi.put('patient-1', 'variant-1', payload);

    expect(putMock).toHaveBeenCalledWith(
      '/api/v1/patients/patient-1/variant-settings/variant-1',
      payload,
    );
  });

  it('get() propagates API errors', async () => {
    const error = new Error('Not Found');
    getMock.mockRejectedValue(error);

    await expect(patientVariantSettingsApi.get('patient-1', 'variant-1')).rejects.toThrow(
      'Not Found',
    );
  });

  it('put() propagates API errors', async () => {
    const error = new Error('Conflict');
    putMock.mockRejectedValue(error);

    await expect(
      patientVariantSettingsApi.put('patient-1', 'variant-1', { config: {} }),
    ).rejects.toThrow('Conflict');
  });
});
