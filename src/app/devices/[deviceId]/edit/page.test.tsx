import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditDevicePage from './page';
import type { DeviceDTO } from '@/types/api';

// --- Mocks ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useParams: () => ({ deviceId: 'dev-abc' }),
}));

const mockRouterPush = vi.fn();

vi.mock('@/lib/api', () => ({
  devicesApi: {
    getById: vi.fn(),
    update: vi.fn(),
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

import { devicesApi, ApiError } from '@/lib/api';

// --- Fixtures ---

const mockDevice: DeviceDTO = {
  device_id: 'dev-abc',
  device_name: 'VR Headset Alpha',
  device_type: 'headset',
  serial_number: 'SN-ALPHA-001',
  active: true,
  firmware_version: '1.2.3',
  notes: 'Test notes',
  registered_by: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: null,
  last_seen_at: null,
  last_connected_at: null,
  last_authenticated_at: null,
  device_secret_last_rotated_at: null,
};

// --- Helpers ---

function renderPage() {
  return render(<EditDevicePage />);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRouterPush.mockReset();
});

// --- Tests ---

describe('EditDevicePage', () => {
  it('shows loading state while fetching initial data', () => {
    vi.mocked(devicesApi.getById).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText(/loading device data/i)).toBeInTheDocument();
  });

  it('pre-populates the form with existing device data', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. VR Headset Alpha/i) as HTMLInputElement;
    const typeInput = screen.getByPlaceholderText(/e\.g\. headset/i) as HTMLInputElement;
    const serialInput = screen.getByPlaceholderText(/e\.g\. SN-ALPHA-001/i) as HTMLInputElement;

    expect(nameInput.value).toBe('VR Headset Alpha');
    expect(typeInput.value).toBe('headset');
    expect(serialInput.value).toBe('SN-ALPHA-001');
    expect(devicesApi.getById).toHaveBeenCalledWith('dev-abc');
  });

  it('calls update and redirects to device detail on successful submit', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);
    vi.mocked(devicesApi.update).mockResolvedValue({ ...mockDevice });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(devicesApi.update).toHaveBeenCalledWith(
        'dev-abc',
        expect.objectContaining({
          name: 'VR Headset Alpha',
          type: 'headset',
          serial_number: 'SN-ALPHA-001',
        }),
      );
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/devices/dev-abc');
    });
  });

  it('shows 401 error state on unauthorized load', async () => {
    vi.mocked(devicesApi.getById).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/session not valid/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: /go to login/i })).toBeInTheDocument();
  });

  it('shows 403 error state on forbidden load', async () => {
    vi.mocked(devicesApi.getById).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Access denied'),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/access denied/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/does not have permission to edit this device/i)).toBeInTheDocument();
  });

  it('shows 404 error state when device is not found', async () => {
    vi.mocked(devicesApi.getById).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Device not found'),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/device not found/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /back to devices/i })).toBeInTheDocument();
  });

  it('shows error banner on generic submit failure', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);
    vi.mocked(devicesApi.update).mockRejectedValue(
      new ApiError(500, 'SERVER_ERROR', 'Internal server error'),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument(),
    );

    // Form remains visible
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('submitting with an edited name sends the name field (not device_name)', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);
    vi.mocked(devicesApi.update).mockResolvedValue({ ...mockDevice, device_name: 'Renamed Headset' });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. VR Headset Alpha/i), {
      target: { value: 'Renamed Headset' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(devicesApi.update).toHaveBeenCalledWith(
        'dev-abc',
        expect.objectContaining({ name: 'Renamed Headset' }),
      );
    });

    const callArg = vi.mocked(devicesApi.update).mock.calls[0][1];
    expect(callArg).not.toHaveProperty('device_name');
  });

  it('submitting with an edited type sends the type field (not device_type)', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);
    vi.mocked(devicesApi.update).mockResolvedValue({ ...mockDevice, device_type: 'controller' });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. headset/i), {
      target: { value: 'controller' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(devicesApi.update).toHaveBeenCalledWith(
        'dev-abc',
        expect.objectContaining({ type: 'controller' }),
      );
    });

    const callArg = vi.mocked(devicesApi.update).mock.calls[0][1];
    expect(callArg).not.toHaveProperty('device_type');
  });

  it('shows error banner on 400 submit failure', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);
    vi.mocked(devicesApi.update).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'serial_number already registered'),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/serial_number already registered/i)).toBeInTheDocument(),
    );

    // Form remains visible after error
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows validation errors when required fields are cleared', async () => {
    vi.mocked(devicesApi.getById).mockResolvedValue(mockDevice);

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument(),
    );

    // Clear required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. VR Headset Alpha/i), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. headset/i), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. SN-ALPHA-001/i), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Device name is required.')).toBeInTheDocument();
      expect(screen.getByText('Device type is required.')).toBeInTheDocument();
      expect(screen.getByText('Serial number is required.')).toBeInTheDocument();
    });

    expect(devicesApi.update).not.toHaveBeenCalled();
  });
});
