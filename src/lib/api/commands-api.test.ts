import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commandsApi } from './commands-api';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
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

const postMock = vi.mocked(apiClient.post);

const fakeSendResponse = {
  command_id: 'cmd-1',
  type: 'command.recenter_view' as const,
  device_id: 'dev-1',
  session_id: 'sess-1',
  status: 'sent' as const,
  delivered_via_ws: true,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  postMock.mockResolvedValue(fakeSendResponse);
});

describe('commandsApi (19B contract)', () => {
  it('send() calls post with the full payload', async () => {
    await commandsApi.send({
      type: 'command.recenter_view',
      device_id: 'dev-1',
      session_id: 'sess-1',
    });

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.recenter_view',
      device_id: 'dev-1',
      session_id: 'sess-1',
    });
  });

  it('recenterView calls post with type command.recenter_view', async () => {
    await commandsApi.recenterView('dev-1', 'sess-1');

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.recenter_view',
      device_id: 'dev-1',
      session_id: 'sess-1',
    });
  });

  it('startSession calls post with type command.start_session and payload', async () => {
    await commandsApi.startSession('dev-1', 'sess-1', { variantId: 'var-1', difficulty: 3 });

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.start_session',
      device_id: 'dev-1',
      session_id: 'sess-1',
      payload: { variantId: 'var-1', difficulty: 3 },
    });
  });

  it('pauseSession calls post with type command.pause_session', async () => {
    await commandsApi.pauseSession('dev-1', 'sess-1');

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.pause_session',
      device_id: 'dev-1',
      session_id: 'sess-1',
    });
  });

  it('resumeSession calls post with type command.resume_session', async () => {
    await commandsApi.resumeSession('dev-1', 'sess-1');

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.resume_session',
      device_id: 'dev-1',
      session_id: 'sess-1',
    });
  });

  it('endSession calls post with type command.end_session and payload', async () => {
    await commandsApi.endSession('dev-1', 'sess-1', { status: 'completed' });

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.end_session',
      device_id: 'dev-1',
      session_id: 'sess-1',
      payload: { status: 'completed' },
    });
  });

  it('updateConfig calls post with type command.update_config wrapping config in payload', async () => {
    const config = { brightness: 80, volume: 50 };
    await commandsApi.updateConfig('dev-1', config, 'sess-1');

    expect(postMock).toHaveBeenCalledWith('/api/v1/commands', {
      type: 'command.update_config',
      device_id: 'dev-1',
      payload: { config },
      session_id: 'sess-1',
    });
  });
});
