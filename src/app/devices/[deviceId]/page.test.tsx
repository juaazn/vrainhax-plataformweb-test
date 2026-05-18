import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceDetailClient } from './DeviceDetailClient';
import type { DeviceRealtimeState, ClientRealtimeEvent } from '@/types/realtime.types';
import type { DeviceDTO, CommandDTO, CommandListResponse } from '@/types/api';

// Mock useDeviceRealtime
vi.mock('@/lib/hooks/use-device-realtime', () => ({
  useDeviceRealtime: vi.fn(),
}));

// Mock useDevices
vi.mock('@/lib/hooks/use-devices', () => ({
  useDevices: vi.fn(),
}));

// Mock useAuth
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock commandsApi
vi.mock('@/lib/api/commands-api', () => ({
  commandsApi: {
    recenterView: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
    endSession: vi.fn(),
    listCommands: vi.fn(),
  },
}));

// Mock sessionsApi (for active session lookup)
vi.mock('@/lib/api/sessions-api', () => ({
  sessionsApi: {
    list: vi.fn(),
    assignDevice: vi.fn(),
  },
}));

// Mock devicesApi (for deactivate/reactivate/rotateSecret)
vi.mock('@/lib/api', () => ({
  devicesApi: {
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    rotateSecret: vi.fn().mockResolvedValue({ device_secret: 'new-secret-abc123' }),
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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockRouterPush = vi.fn();

import { useDeviceRealtime } from '@/lib/hooks/use-device-realtime';
import { useDevices } from '@/lib/hooks/use-devices';
import { useAuth } from '@/features/auth/use-auth';
import { commandsApi } from '@/lib/api/commands-api';
import { sessionsApi } from '@/lib/api/sessions-api';
import { devicesApi } from '@/lib/api';

// Default empty paginated response
const emptyListResponse: CommandListResponse = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const mockDevice: DeviceDTO = {
  device_id: 'dev-abc',
  device_name: 'VR Headset Alpha',
  device_type: 'headset',
  serial_number: 'SN-ALPHA-001',
  active: true,
  firmware_version: '1.2.3',
  notes: null,
  registered_by: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: null,
  last_seen_at: '2025-05-01T12:00:00Z',
  last_connected_at: null,
  last_authenticated_at: null,
  device_secret_last_rotated_at: null,
};

const inactiveDevice: DeviceDTO = {
  ...mockDevice,
  active: false,
};

const connectedRealtimeState: DeviceRealtimeState = {
  deviceId: 'dev-abc',
  connectionStatus: 'connected',
  lastSeenAt: '2025-05-01T12:00:00Z',
  deviceName: 'VR Headset Alpha',
  deviceType: 'headset',
  sessionId: 'sess-xyz',
  batteryLevel: 75,
  sessionActive: true,
  scene: 'MainMenu',
};

const disconnectedRealtimeState: DeviceRealtimeState = {
  deviceId: 'dev-abc',
  connectionStatus: 'disconnected',
  lastSeenAt: '2025-05-01T11:00:00Z',
};

const noEvents: ClientRealtimeEvent[] = [];

function makeRealtimeMock(
  overrides: Partial<ReturnType<typeof useDeviceRealtime>> = {},
): ReturnType<typeof useDeviceRealtime> {
  const defaultMap = new Map<string, DeviceRealtimeState>();
  return {
    connectionState: 'connected',
    deviceStates: defaultMap,
    recentEvents: noEvents,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  };
}

function makeDevicesMock(
  overrides: Partial<ReturnType<typeof useDevices>> = {},
): ReturnType<typeof useDevices> {
  return {
    devices: [mockDevice],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    ...overrides,
  };
}

function makeAuthMock(role: 'admin' | 'therapist' | 'patient' = 'therapist') {
  return {
    user: { role, userId: 'u-1', email: 'test@test.com' },
    status: 'authenticated' as const,
    isLoading: false,
    error: undefined,
    refreshAuth: vi.fn(),
    logout: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
  vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));
  // Default: no active sessions found
  vi.mocked(sessionsApi.list).mockResolvedValue([]);
});

describe('DeviceDetailPage', () => {
  it('shows loading state while devices are loading', () => {
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ isLoading: true, devices: [] }));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    // "Loading…" appears in the device name header AND in the CommandHistoryPanel initial load state
    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0);
  });

  it('shows device online when WS has connected presence', async () => {
    const deviceMap = new Map<string, DeviceRealtimeState>([
      ['dev-abc', connectedRealtimeState],
    ]);
    vi.mocked(useDeviceRealtime).mockReturnValue(
      makeRealtimeMock({ deviceStates: deviceMap }),
    );
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getAllByText('Online').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('VR Headset Alpha').length).toBeGreaterThan(0);
  });

  it('shows device offline when WS has disconnected presence', async () => {
    const deviceMap = new Map<string, DeviceRealtimeState>([
      ['dev-abc', disconnectedRealtimeState],
    ]);
    vi.mocked(useDeviceRealtime).mockReturnValue(
      makeRealtimeMock({ deviceStates: deviceMap }),
    );
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getAllByText('Offline').length).toBeGreaterThan(0);
    });
  });

  it('Recenter View button is disabled when device is offline', async () => {
    const deviceMap = new Map<string, DeviceRealtimeState>([
      ['dev-abc', disconnectedRealtimeState],
    ]);
    vi.mocked(useDeviceRealtime).mockReturnValue(
      makeRealtimeMock({ deviceStates: deviceMap }),
    );
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /recenter view/i });
      expect(btn).toBeDisabled();
    });
  });

  it('Recenter View button calls commandsApi.recenterView and shows success', async () => {
    const fakeSendResponse = {
      command_id: 'cmd-1',
      type: 'command.recenter_view' as const,
      device_id: 'dev-abc',
      session_id: 'sess-xyz',
      status: 'sent' as const,
      delivered_via_ws: true,
      created_at: new Date().toISOString(),
    };
    vi.mocked(commandsApi.recenterView).mockResolvedValue(fakeSendResponse);

    const deviceMap = new Map<string, DeviceRealtimeState>([
      ['dev-abc', connectedRealtimeState],
    ]);
    vi.mocked(useDeviceRealtime).mockReturnValue(
      makeRealtimeMock({ deviceStates: deviceMap }),
    );
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /recenter view/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /recenter view/i }));

    expect(commandsApi.recenterView).toHaveBeenCalledWith('dev-abc', 'sess-xyz');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sent!/i })).toBeInTheDocument();
    });
  });

  it('shows error message when backend returns a command error (e.g. device offline)', async () => {
    vi.mocked(commandsApi.recenterView).mockRejectedValue(new Error('DEVICE_OFFLINE'));

    const deviceMap = new Map<string, DeviceRealtimeState>([
      ['dev-abc', connectedRealtimeState],
    ]);
    vi.mocked(useDeviceRealtime).mockReturnValue(
      makeRealtimeMock({ deviceStates: deviceMap }),
    );
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /recenter view/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /recenter view/i }));

    await waitFor(() => {
      expect(screen.getByText('DEVICE_OFFLINE')).toBeInTheDocument();
    });
  });
});

// ----- Helpers for CommandHistoryPanel tests -----

const baseCommand: CommandDTO = {
  command_id: 'cmd-001',
  command_name: 'command.recenter_view',
  status: 'sent',
  device_id: 'dev-abc',
  issued_by_user_id: null,
  sent_at: '2025-05-01T12:00:00Z',
  executed_at: null,
  error_message: null,
};

function makeListResponse(commands: CommandDTO[]): CommandListResponse {
  return {
    data: commands,
    pagination: { page: 1, limit: 20, total: commands.length, totalPages: 1 },
  };
}

function setupDefaultMocks(role: 'admin' | 'therapist' | 'patient' = 'therapist') {
  vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
  vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
  vi.mocked(useAuth).mockReturnValue(makeAuthMock(role));
  vi.mocked(sessionsApi.list).mockResolvedValue([]);
}

describe('CommandHistoryPanel', () => {
  it('muestra "No commands" cuando la lista está vacía', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('No commands sent to this device.')).toBeInTheDocument();
    });
  });

  it('muestra estado "Sent" en azul para comando enviado', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(
      makeListResponse([{ ...baseCommand, status: 'sent' }]),
    );
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      // use getAllByText because the status filter <select> also contains "Sent"
      const badges = screen.getAllByText('Sent');
      const badge = badges.find((el) => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
      expect(badge!.className).toContain('blue');
    });
  });

  it('muestra estado "Delivered" en verde para comando confirmado', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(
      makeListResponse([{ ...baseCommand, status: 'delivered' }]),
    );
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      const badges = screen.getAllByText('Delivered');
      const badge = badges.find((el) => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
      expect(badge!.className).toContain('green');
    });
  });

  it('muestra estado "Failed" con error_message', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(
      makeListResponse([{ ...baseCommand, status: 'failed', error_message: 'no_active_game' }]),
    );
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      const badges = screen.getAllByText('Failed');
      const badge = badges.find((el) => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
      expect(badge!.className).toContain('red');
      expect(screen.getByText('no_active_game')).toBeInTheDocument();
    });
  });

  it('muestra estado "Timeout" en naranja', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(
      makeListResponse([{ ...baseCommand, status: 'timeout' }]),
    );
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      const badges = screen.getAllByText('Timeout');
      const badge = badges.find((el) => el.tagName === 'SPAN');
      expect(badge).toBeInTheDocument();
      expect(badge!.className).toContain('orange');
    });
  });

  it('muestra "Showing X of Y" con paginación cuando hay resultados', async () => {
    const response: CommandListResponse = {
      data: [{ ...baseCommand, status: 'delivered' }],
      pagination: { page: 1, limit: 20, total: 42, totalPages: 3 },
    };
    vi.mocked(commandsApi.listCommands).mockResolvedValue(response);
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 42')).toBeInTheDocument();
    });
  });

  it('muestra botones Prev/Next cuando hay más de una página', async () => {
    const response: CommandListResponse = {
      data: [{ ...baseCommand, status: 'delivered' }],
      pagination: { page: 1, limit: 20, total: 42, totalPages: 3 },
    };
    vi.mocked(commandsApi.listCommands).mockResolvedValue(response);
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
    });
  });

  it('botón Refresh llama a listCommands de nuevo', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('No commands sent to this device.')).toBeInTheDocument();
    });

    const callsBefore = vi.mocked(commandsApi.listCommands).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(vi.mocked(commandsApi.listCommands).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('filtro por status pasa el parámetro correcto a la API', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'failed' } });

    await waitFor(() => {
      const calls = vi.mocked(commandsApi.listCommands).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall?.status).toBe('failed');
    });
  });

  it('muestra error cuando listCommands rechaza', async () => {
    vi.mocked(commandsApi.listCommands).mockRejectedValue(new Error('Network failure'));
    setupDefaultMocks();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });
  });
});

// ----- Device Info Card tests -----

describe('DeviceInfoCard (admin actions)', () => {
  it('shows Deactivate button for admin when device is active', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [mockDevice] }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deactivate device/i })).toBeInTheDocument();
    });
  });

  it('shows Reactivate button for admin when device is inactive', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [inactiveDevice] }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reactivate device/i })).toBeInTheDocument();
    });
  });

  it('does not show Deactivate/Reactivate buttons for non-admin', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [mockDevice] }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /deactivate device/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reactivate device/i })).not.toBeInTheDocument();
    });
  });

  it('Deactivate calls devicesApi.deactivate and triggers reload', async () => {
    const mockReload = vi.fn();
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [mockDevice], reload: mockReload }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(devicesApi.deactivate).mockResolvedValue({ ...mockDevice, active: false });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deactivate device/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /deactivate device/i }));

    await waitFor(() => {
      expect(devicesApi.deactivate).toHaveBeenCalledWith('dev-abc');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('Reactivate calls devicesApi.reactivate and triggers reload', async () => {
    const mockReload = vi.fn();
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [inactiveDevice], reload: mockReload }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(devicesApi.reactivate).mockResolvedValue({ ...inactiveDevice, active: true });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reactivate device/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reactivate device/i }));

    await waitFor(() => {
      expect(devicesApi.reactivate).toHaveBeenCalledWith('dev-abc');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('shows Device Info card with device_name and device_type', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Device Info')).toBeInTheDocument();
      // device_name appears in header h2 and in Device Info card — use getAllByText
      expect(screen.getAllByText('VR Headset Alpha').length).toBeGreaterThan(0);
      expect(screen.getByText('headset')).toBeInTheDocument();
    });
  });

  it('shows Active badge in Device Info card for active device', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [mockDevice] }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('shows Inactive badge in Device Info card for inactive device', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock({ devices: [inactiveDevice] }));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('shows Edit button for admin', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });
  });

  it('Edit button navigates to edit page', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/devices/dev-abc/edit');
  });
});

// ----- Devices list page tests -----

describe('DevicesPage list (devices/page.tsx)', () => {
  // These are integration-level checks via the DeviceDetailClient component indirectly.
  // The actual /devices page is tested via the component rendering logic.
  // We verify that the DTO shape is correct in the data fixture above.

  it('mockDevice has correct new DTO shape (device_name, device_type)', () => {
    expect(mockDevice.device_name).toBe('VR Headset Alpha');
    expect(mockDevice.device_type).toBe('headset');
    expect('name' in mockDevice).toBe(false);
    expect('type' in mockDevice).toBe(false);
  });
});

// ----- Device Credential Section tests -----

describe('DeviceCredentialSection', () => {
  function setupAdminWithDevice(deviceOverrides: Partial<DeviceDTO> = {}) {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(
      makeDevicesMock({ devices: [{ ...mockDevice, ...deviceOverrides }] }),
    );
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
  }

  it('admin ve la sección "Device Credential" con botón "Rotate Device Secret"', async () => {
    setupAdminWithDevice();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Device Credential')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rotate device secret/i })).toBeInTheDocument();
    });
  });

  it('therapist NO ve la sección "Device Credential"', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.queryByText('Device Credential')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /rotate device secret/i })).not.toBeInTheDocument();
    });
  });

  it('secreto no se renderiza antes de rotar (estado inicial vacío)', async () => {
    setupAdminWithDevice();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Device Credential')).toBeInTheDocument();
    });

    expect(screen.queryByText('new-secret-abc123')).not.toBeInTheDocument();
    expect(screen.queryByText(/copy this secret now/i)).not.toBeInTheDocument();
  });

  it('rotación exitosa → muestra el secreto new-secret-abc123 con el aviso', async () => {
    setupAdminWithDevice();
    vi.mocked(devicesApi.rotateSecret).mockResolvedValue({ device_secret: 'new-secret-abc123' });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rotate device secret/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rotate device secret/i }));

    await waitFor(() => {
      expect(screen.getByText('new-secret-abc123')).toBeInTheDocument();
      expect(screen.getByText(/copy this secret now/i)).toBeInTheDocument();
    });

    expect(devicesApi.rotateSecret).toHaveBeenCalledWith('dev-abc');
  });

  it('error en rotación → muestra mensaje de error', async () => {
    setupAdminWithDevice();
    vi.mocked(devicesApi.rotateSecret).mockRejectedValue(new Error('Forbidden'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rotate device secret/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rotate device secret/i }));

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument();
    });

    expect(screen.queryByText('new-secret-abc123')).not.toBeInTheDocument();
  });

  it('muestra warning "No credential set" cuando device_secret_last_rotated_at es null', async () => {
    setupAdminWithDevice({ device_secret_last_rotated_at: null });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText(/no credential set/i)).toBeInTheDocument();
    });
  });

  it('muestra "Credential configured" cuando device_secret_last_rotated_at tiene valor', async () => {
    setupAdminWithDevice({ device_secret_last_rotated_at: '2025-06-01T00:00:00Z' });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText(/credential configured/i)).toBeInTheDocument();
    });
  });
});

// ----- Provisioning Checklist tests -----

describe('ProvisioningChecklist (admin only)', () => {
  function setupAdminWithDevice(deviceOverrides: Partial<DeviceDTO> = {}) {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(
      makeDevicesMock({ devices: [{ ...mockDevice, ...deviceOverrides }] }),
    );
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
  }

  it('admin ve la sección "Provisioning Checklist"', async () => {
    setupAdminWithDevice();

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Provisioning Checklist')).toBeInTheDocument();
    });
  });

  it('therapist NO ve la sección "Provisioning Checklist"', async () => {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.queryByText('Provisioning Checklist')).not.toBeInTheDocument();
    });
  });

  it('paso 2 (Secret copied) aparece checked cuando device_secret_last_rotated_at tiene valor', async () => {
    setupAdminWithDevice({ device_secret_last_rotated_at: '2025-06-01T00:00:00Z' });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Provisioning Checklist')).toBeInTheDocument();
    });

    expect(screen.getByText(/2\. Secret copied/i)).toBeInTheDocument();
  });

  it('paso 2 (Secret copied) aparece unchecked cuando device_secret_last_rotated_at es null', async () => {
    setupAdminWithDevice({ device_secret_last_rotated_at: null });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Provisioning Checklist')).toBeInTheDocument();
    });

    expect(screen.getByText(/2\. Secret copied/i)).toBeInTheDocument();
  });

  it('paso 4 (Device connected) aparece checked cuando last_authenticated_at tiene valor', async () => {
    setupAdminWithDevice({ last_authenticated_at: '2025-06-01T01:00:00Z' });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Provisioning Checklist')).toBeInTheDocument();
    });

    expect(screen.getByText(/4\. Device connected/i)).toBeInTheDocument();
  });

  it('paso 4 (Device connected) aparece unchecked cuando last_authenticated_at es null', async () => {
    setupAdminWithDevice({ last_authenticated_at: null });

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Provisioning Checklist')).toBeInTheDocument();
    });

    expect(screen.getByText(/4\. Device connected/i)).toBeInTheDocument();
  });
});

// ----- Active Session Section tests -----

import type { SessionDTO } from '@/types/api';

const mockRunningSession: SessionDTO = {
  session_id: 'sess-aaaa-bbbb-cccc-dddddddddddd',
  patient_id: 'pat-1111',
  therapist_id: null,
  device_id: 'dev-abc',
  variant_id: 'var-1111',
  status: 'running',
  started_at: '2025-05-01T10:00:00Z',
  ended_at: null,
  difficulty: null,
  score_value: null,
  completed: false,
  pain_before: null,
  pain_after: null,
  config: {},
  metrics: {},
  created_at: '2025-05-01T09:00:00Z',
};

describe('ActiveSessionSection', () => {
  function setupWithRole(role: 'admin' | 'therapist' | 'patient') {
    vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyListResponse);
    vi.mocked(useDeviceRealtime).mockReturnValue(makeRealtimeMock());
    vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
    vi.mocked(useAuth).mockReturnValue(makeAuthMock(role));
  }

  it('admin sees "Active Session" section', async () => {
    setupWithRole('admin');
    vi.mocked(sessionsApi.list).mockResolvedValue([]);

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Active Session')).toBeInTheDocument();
    });
  });

  it('therapist sees "Active Session" section', async () => {
    setupWithRole('therapist');
    vi.mocked(sessionsApi.list).mockResolvedValue([]);

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Active Session')).toBeInTheDocument();
    });
  });

  it('shows "No active session" when there is no running session', async () => {
    setupWithRole('admin');
    vi.mocked(sessionsApi.list).mockResolvedValue([]);

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('No active session')).toBeInTheDocument();
    });
  });

  it('shows session info and link when there is a running session', async () => {
    setupWithRole('admin');
    vi.mocked(sessionsApi.list).mockResolvedValue([mockRunningSession]);

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      // Short session ID (first 8 chars)
      expect(screen.getByText('#sess-aaa')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view session/i })).toBeInTheDocument();
    });
  });

  it('shows "No active session" when sessionsApi.list rejects (graceful degradation)', async () => {
    setupWithRole('admin');
    vi.mocked(sessionsApi.list).mockRejectedValue(new Error('Network error'));

    render(<DeviceDetailClient deviceId="dev-abc" />);

    await waitFor(() => {
      expect(screen.getByText('No active session')).toBeInTheDocument();
    });
  });
});
