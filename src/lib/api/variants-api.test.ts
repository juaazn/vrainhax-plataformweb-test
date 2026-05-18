import { describe, it, expect, vi, beforeEach } from 'vitest';
import { variantsApi } from './variants-api';
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

const fakeVariantSchema = {
  variant_id: 'var-1',
  variant_code: 'SHOULDER_BASIC',
  name: 'Basic',
  description: null,
  score_unit: 'points',
  active: true,
  module: {
    module_id: 'mod-1',
    module_code: 'SHOULDER',
    name: 'Shoulder Rehabilitation',
  },
  config_schema: {
    type: 'object',
    properties: {
      difficulty: { type: 'integer', minimum: 1, maximum: 10 },
    },
  },
  metrics_schema: [
    {
      key: 'score',
      label: 'Score',
      type: 'number' as const,
      unit: 'points',
    },
  ],
  realtime_events: ['metric.update', 'session.end'],
  commands: [
    {
      variant_command_id: 'vc-1',
      command_name: 'set_difficulty',
      label: 'Set Difficulty',
      parameter_schema: { type: 'object' },
      description: null,
      active: true,
      sort_order: 0,
    },
  ],
};

const fakeCommands = [fakeVariantSchema.commands[0]];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('variantsApi', () => {
  it('getSchema(variantId) calls GET /api/v1/variants/:id', async () => {
    getMock.mockResolvedValue(fakeVariantSchema);

    const result = await variantsApi.getSchema('var-1');

    expect(getMock).toHaveBeenCalledWith('/api/v1/variants/var-1');
    expect(result).toEqual(fakeVariantSchema);
  });

  it('getSchema returns config_schema, metrics_schema and commands', async () => {
    getMock.mockResolvedValue(fakeVariantSchema);

    const result = await variantsApi.getSchema('var-1');

    expect(result.config_schema).toEqual(fakeVariantSchema.config_schema);
    expect(result.metrics_schema).toEqual(fakeVariantSchema.metrics_schema);
    expect(result.commands).toEqual(fakeVariantSchema.commands);
  });

  it('listCommands(variantId) calls GET /api/v1/variants/:id/commands', async () => {
    getMock.mockResolvedValue(fakeCommands);

    const result = await variantsApi.listCommands('var-1');

    expect(getMock).toHaveBeenCalledWith('/api/v1/variants/var-1/commands');
    expect(result).toEqual(fakeCommands);
  });
});
