import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewDevicePage from './page';
import type { DeviceCreateResponse } from '@/types/api';

// --- Mocks ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockRouterPush = vi.fn();

vi.mock('@/lib/api', () => ({
  devicesApi: {
    create: vi.fn(),
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

const createdDevice: DeviceCreateResponse = {
  device_id: 'dev-new-001',
  device_name: 'New Headset',
  device_type: 'headset',
  serial_number: 'SN-NEW-001',
  active: true,
  firmware_version: '2.0.0',
  notes: null,
  registered_by: 'user-1',
  created_at: '2026-05-18T00:00:00Z',
  updated_at: null,
  last_seen_at: null,
  last_connected_at: null,
  last_authenticated_at: null,
  device_secret_last_rotated_at: '2026-05-18T00:00:00Z',
  device_secret: 'initial-secret-xyz-789',
};

// --- Helpers ---

function fillRequiredFields(
  name = 'New Headset',
  type = 'headset',
  serial = 'SN-NEW-001',
) {
  fireEvent.change(screen.getByPlaceholderText(/e\.g\. VR Headset Alpha/i), {
    target: { value: name },
  });
  fireEvent.change(screen.getByPlaceholderText(/e\.g\. headset/i), {
    target: { value: type },
  });
  fireEvent.change(screen.getByPlaceholderText(/e\.g\. SN-ALPHA-001/i), {
    target: { value: serial },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRouterPush.mockReset();
});

// --- Tests ---

describe('NewDevicePage', () => {
  it('renders the form with all required fields', () => {
    render(<NewDevicePage />);

    expect(screen.getByText('New Device')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register device/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. VR Headset Alpha/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. headset/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. SN-ALPHA-001/i)).toBeInTheDocument();
  });

  it('shows validation errors when required fields are empty', async () => {
    render(<NewDevicePage />);

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByText('Device name is required.')).toBeInTheDocument();
      expect(screen.getByText('Device type is required.')).toBeInTheDocument();
      expect(screen.getByText('Serial number is required.')).toBeInTheDocument();
    });

    expect(devicesApi.create).not.toHaveBeenCalled();
  });

  it('calls devicesApi.create and shows Initial Secret panel on successful submit', async () => {
    vi.mocked(devicesApi.create).mockResolvedValue(createdDevice);

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(devicesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Headset',
          type: 'headset',
          serial_number: 'SN-NEW-001',
        }),
      );
    });

    // Should show the secret panel, NOT redirect immediately
    await waitFor(() => {
      expect(screen.getByText('Device Created')).toBeInTheDocument();
    });

    expect(screen.getByText('Initial Secret')).toBeInTheDocument();
    expect(screen.getByText('Copy this secret now. It will not be shown again.')).toBeInTheDocument();
    expect(screen.getByText('initial-secret-xyz-789')).toBeInTheDocument();
    // No immediate redirect
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows Copy to clipboard button after successful POST', async () => {
    vi.mocked(devicesApi.create).mockResolvedValue(createdDevice);

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument();
    });
  });

  it('Go to device button navigates to device detail page', async () => {
    vi.mocked(devicesApi.create).mockResolvedValue(createdDevice);

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to device/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to device/i }));

    expect(mockRouterPush).toHaveBeenCalledWith('/devices/dev-new-001');
  });

  it('shows 401 error state on unauthorized submit', async () => {
    vi.mocked(devicesApi.create).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'),
    );

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByText(/session not valid/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to login/i })).toBeInTheDocument();
    });
  });

  it('shows 403 error state on forbidden submit', async () => {
    vi.mocked(devicesApi.create).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Access denied'),
    );

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/does not have permission to register devices/i)).toBeInTheDocument();
    });
  });

  it('shows error banner on generic API failure (400)', async () => {
    vi.mocked(devicesApi.create).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'serial_number already registered'),
    );

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByText('serial_number already registered')).toBeInTheDocument();
    });

    // Form remains visible after error
    expect(screen.getByRole('button', { name: /register device/i })).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    // Never resolves during test
    vi.mocked(devicesApi.create).mockReturnValue(new Promise(() => undefined));

    render(<NewDevicePage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /register device/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /registering.../i })).toBeInTheDocument();
    });
  });
});
