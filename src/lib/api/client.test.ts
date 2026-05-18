import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from './client';

function makeFetchMock(status: number, body: unknown, ok?: boolean): ReturnType<typeof vi.fn> {
  const isOk = ok ?? (status >= 200 && status < 300);
  return vi.fn().mockResolvedValue({
    ok: isOk,
    status,
    statusText: status === 200 ? 'OK' : status === 401 ? 'Unauthorized' : status === 404 ? 'Not Found' : 'Internal Server Error',
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('apiClient', () => {
  it('unwraps { data: T } and returns T on 200', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, { data: { id: 'abc', name: 'Device A' } }));

    const result = await apiClient.get<{ id: string; name: string }>('/api/v1/devices/abc');

    expect(result).toEqual({ id: 'abc', name: 'Device A' });
  });

  it('throws ApiError with status 401 on unauthorized response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(401, { error: 'UNAUTHORIZED', message: 'Not authenticated' }, false),
    );

    await expect(apiClient.get('/api/v1/devices')).rejects.toBeInstanceOf(ApiError);
    await expect(apiClient.get('/api/v1/devices')).rejects.toMatchObject({ status: 401 });
  });

  it('throws ApiError with status 404 on not found response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(404, { error: 'NOT_FOUND', message: 'Resource not found' }, false),
    );

    await expect(apiClient.get('/api/v1/devices/missing')).rejects.toBeInstanceOf(ApiError);
    await expect(apiClient.get('/api/v1/devices/missing')).rejects.toMatchObject({ status: 404 });
  });

  it('throws ApiError with status 500 on server error', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(500, { error: 'SERVER_ERROR', message: 'Internal error' }, false),
    );

    await expect(apiClient.post('/api/v1/commands', {})).rejects.toBeInstanceOf(ApiError);
    await expect(apiClient.post('/api/v1/commands', {})).rejects.toMatchObject({ status: 500 });
  });

  it('passes credentials: include in every request', async () => {
    const fetchSpy = makeFetchMock(200, { data: [] });
    vi.stubGlobal('fetch', fetchSpy);

    await apiClient.get('/api/v1/devices');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
