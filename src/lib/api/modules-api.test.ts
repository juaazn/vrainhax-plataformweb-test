import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modulesApi } from './modules-api';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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

const fakeModule = {
  module_id: 'mod-1',
  module_code: 'SHOULDER',
  name: 'Shoulder Rehabilitation',
  description: null,
  type: 'rehabilitation',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  variants: [],
};

const fakeVariantSummary = {
  variant_id: 'var-1',
  variant_code: 'SHOULDER_BASIC',
  name: 'Basic',
  description: null,
  score_unit: 'points',
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('modulesApi', () => {
  it('list() calls GET /api/v1/modules without params', async () => {
    getMock.mockResolvedValue([fakeModule]);

    const result = await modulesApi.list();

    expect(getMock).toHaveBeenCalledWith('/api/v1/modules', undefined);
    expect(result).toEqual([fakeModule]);
  });

  it('list() passes active param to GET /api/v1/modules', async () => {
    getMock.mockResolvedValue([fakeModule]);

    await modulesApi.list({ active: true });

    expect(getMock).toHaveBeenCalledWith('/api/v1/modules', { active: true });
  });

  it('listVariants(moduleId) calls GET /api/v1/modules/:id/variants', async () => {
    getMock.mockResolvedValue([fakeVariantSummary]);

    const result = await modulesApi.listVariants('mod-1');

    expect(getMock).toHaveBeenCalledWith('/api/v1/modules/mod-1/variants', undefined);
    expect(result).toEqual([fakeVariantSummary]);
  });

  it('listVariants() passes active param', async () => {
    getMock.mockResolvedValue([]);

    await modulesApi.listVariants('mod-1', { active: false });

    expect(getMock).toHaveBeenCalledWith('/api/v1/modules/mod-1/variants', { active: false });
  });
});
