import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SessionDetailPage from './page';
import type { SessionDetailDTO } from '@/types/api';
import type { DeviceDTO } from '@/types/api';

// Mock next/navigation
const mockParams = { sessionId: 'sess-1234-5678-abcd-efgh' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

// Mock useSession
vi.mock('@/lib/hooks/use-session', () => ({
  useSession: vi.fn(),
}));

// Mock useDevices
vi.mock('@/lib/hooks/use-devices', () => ({
  useDevices: vi.fn(),
}));

// Mock useAuth
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock sessionsApi
vi.mock('@/lib/api/sessions-api', () => ({
  sessionsApi: {
    assignDevice: vi.fn(),
    listEvents: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    listTimeline: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
    }),
    getReport: vi.fn().mockResolvedValue({
      report_id: 'rep-1',
      session_id: 'sess-1',
      generated_at: '2026-05-18T10:01:00Z',
      patient: { patient_id: 'pat-1', first_name: 'Juan', last_name: 'García' },
      therapist: { user_id: 'user-1', name: 'Dr. López', email: 'dr@test.com' },
      device: { device_id: 'dev-1', device_name: 'Quest Pro', serial_number: 'A1B2' },
      session: { status: 'completed', started_at: '2026-05-18T09:00:00Z', ended_at: '2026-05-18T10:00:00Z', duration_seconds: 3600 },
      summary: {
        total_events: 3, total_metrics: 2, total_commands: 5,
        delivered_commands: 4, failed_commands: 1, timeout_commands: 0,
        last_score: 87, total_repetitions: 10, elapsed_seconds: 45,
        highlights: ['2 metric events received', 'Last score: 87'],
        warnings: ['1 command(s) failed'],
      },
      timeline: [],
      sections: [{ title: 'Failed Commands', items: ['command.recenter_view — failed'] }],
    }),
    getSummary: vi.fn().mockResolvedValue({
      session_id: 'sess-1',
      patient: { patient_id: 'pat-1', first_name: 'Juan', last_name: 'García' },
      therapist: { user_id: 'user-1', name: 'Dr. López', email: 'dr@test.com' },
      device: { device_id: 'dev-1', device_name: 'Quest Pro', serial_number: 'A1B2' },
      status: 'running',
      started_at: '2026-05-18T10:00:00Z',
      ended_at: undefined,
      duration_seconds: undefined,
      metrics: {
        total_events: 3, total_metrics: 2, total_commands: 5,
        delivered_commands: 4, failed_commands: 0, timeout_commands: 1,
        last_score: 87, total_repetitions: 10, elapsed_seconds: 45,
      },
      highlights: ['2 metric events received', 'Last recorded score: 87', '4 commands completed successfully'],
      warnings: ['1 command(s) timed out'],
      generated_at: '2026-05-18T10:01:00Z',
    }),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  },
}));

// Mock commandsApi
vi.mock('@/lib/api/commands-api', () => ({
  commandsApi: {
    listCommands: vi.fn(),
    recenterView: vi.fn(),
    endSession: vi.fn(),
  },
}));

// Mock ApiError
vi.mock('@/lib/api', () => ({
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

import { useSession } from '@/lib/hooks/use-session';
import { useDevices } from '@/lib/hooks/use-devices';
import { useAuth } from '@/features/auth/use-auth';
import { sessionsApi } from '@/lib/api/sessions-api';
import { commandsApi } from '@/lib/api/commands-api';
import { ApiError } from '@/lib/api';

// ----- Fixtures -----

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
  last_seen_at: null,
  last_connected_at: null,
  last_authenticated_at: null,
  device_secret_last_rotated_at: null,
};

const sessionWithDevice: SessionDetailDTO = {
  session_id: 'sess-1234-5678-abcd-efgh',
  patient_id: 'p-1111',
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
  patient: { first_name: 'Ana', last_name: 'Lopez' },
  device: { name: 'VR Headset Alpha', serial_number: 'SN-ALPHA-001' },
};

const sessionWithoutDevice: SessionDetailDTO = {
  ...sessionWithDevice,
  device_id: null,
  device: null,
};

function makeSessionMock(session: SessionDetailDTO | null, overrides: Partial<ReturnType<typeof useSession>> = {}): ReturnType<typeof useSession> {
  return {
    session,
    isLoading: false,
    error: null,
    reload: vi.fn(),
    ...overrides,
  };
}

function makeDevicesMock(devices: DeviceDTO[] = [mockDevice]): ReturnType<typeof useDevices> {
  return {
    devices,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  };
}

function makeAuthMock(role: 'admin' | 'therapist' | 'patient') {
  return {
    user: { role, userId: 'u-1', email: 'test@test.com' },
    status: 'authenticated' as const,
    isLoading: false,
    error: undefined,
    refreshAuth: vi.fn(),
    logout: vi.fn(),
  };
}

const emptyCommandList = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
  vi.mocked(commandsApi.listCommands).mockResolvedValue(emptyCommandList);
  vi.mocked(commandsApi.recenterView).mockResolvedValue({
    command_id: 'cmd-1',
    type: 'command.recenter_view',
    device_id: 'dev-abc',
    session_id: 'sess-1234-5678-abcd-efgh',
    status: 'queued',
    delivered_via_ws: false,
    created_at: '2025-05-01T10:00:00Z',
  });
  vi.mocked(commandsApi.endSession).mockResolvedValue({
    command_id: 'cmd-2',
    type: 'command.end_session',
    device_id: 'dev-abc',
    session_id: 'sess-1234-5678-abcd-efgh',
    status: 'queued',
    delivered_via_ws: false,
    created_at: '2025-05-01T10:00:00Z',
  });
});

// ----- Tests: Device Assignment visibility -----

describe('SessionDetailPage — Device Assignment section', () => {
  it('admin sees "Device Assignment" section', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Device Assignment')).toBeInTheDocument();
    });
  });

  it('therapist sees "Device Assignment" section', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Device Assignment')).toBeInTheDocument();
    });
  });

  it('patient does NOT see "Device Assignment" section', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      // The patient name row should be visible confirming session loaded
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Device Assignment')).not.toBeInTheDocument();
  });

  it('shows "No device assigned" when session has no device', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      // Both DeviceAssignmentSection and OperatorConsole show "No device assigned"
      const elements = screen.getAllByText('No device assigned');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('shows device name and serial when session has a device', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      // Both DeviceAssignmentSection and OperatorConsole show device info
      const elements = screen.getAllByText('VR Headset Alpha');
      expect(elements.length).toBeGreaterThan(0);
      const serials = screen.getAllByText('(SN-ALPHA-001)');
      expect(serials.length).toBeGreaterThan(0);
    });
  });

  it('shows device selector dropdown when session has no device', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select device')).toBeInTheDocument();
      expect(screen.getByLabelText('Assign device')).toBeInTheDocument();
    });
  });

  it('shows Change button when session has a device', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Change device')).toBeInTheDocument();
    });
  });

  it('Assign button is disabled when no device is selected', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      const assignBtn = screen.getByLabelText('Assign device');
      expect(assignBtn).toBeDisabled();
    });
  });

  it('Assign button calls sessionsApi.assignDevice with correct args', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.assignDevice).mockResolvedValue(sessionWithDevice);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select device')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Select device'), {
      target: { value: 'dev-abc' },
    });

    fireEvent.click(screen.getByLabelText('Assign device'));

    await waitFor(() => {
      expect(sessionsApi.assignDevice).toHaveBeenCalledWith(
        'sess-1234-5678-abcd-efgh',
        'dev-abc',
      );
    });
  });
});

// ----- Tests: Error handling on 409 -----

describe('SessionDetailPage — Device Assignment error handling', () => {
  it('shows error message on 409 DEVICE_INACTIVE', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.assignDevice).mockRejectedValue(
      new ApiError(409, 'DEVICE_INACTIVE', 'Device is inactive'),
    );

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select device')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Select device'), {
      target: { value: 'dev-abc' },
    });

    fireEvent.click(screen.getByLabelText('Assign device'));

    await waitFor(() => {
      expect(
        screen.getByText('This device is inactive and cannot be assigned'),
      ).toBeInTheDocument();
    });
  });

  it('shows error message on 409 SESSION_NOT_ACTIVE', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.assignDevice).mockRejectedValue(
      new ApiError(409, 'SESSION_NOT_ACTIVE', 'Session is not active'),
    );

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select device')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Select device'), {
      target: { value: 'dev-abc' },
    });

    fireEvent.click(screen.getByLabelText('Assign device'));

    await waitFor(() => {
      expect(
        screen.getByText('This session is no longer active'),
      ).toBeInTheDocument();
    });
  });

  it('shows error message on 404', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.assignDevice).mockRejectedValue(
      new ApiError(404, 'DEVICE_NOT_FOUND', 'Device not found'),
    );

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Select device')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Select device'), {
      target: { value: 'dev-abc' },
    });

    fireEvent.click(screen.getByLabelText('Assign device'));

    await waitFor(() => {
      expect(screen.getByText('Device not found')).toBeInTheDocument();
    });
  });
});

// ----- Tests: OperatorConsole -----

describe('OperatorConsole', () => {
  it('session running with assigned device shows action buttons Recenter/End', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Operator Console')).toBeInTheDocument();
      expect(screen.getByText('Recenter View')).toBeInTheDocument();
      expect(screen.getByText('End Session')).toBeInTheDocument();
    });
  });

  it('session running without device shows "No device assigned" in console', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithoutDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Operator Console')).toBeInTheDocument();
      const noDeviceMessages = screen.getAllByText('No device assigned');
      expect(noDeviceMessages.length).toBeGreaterThan(0);
    });
  });

  it('session with status completed shows actions disabled', async () => {
    const completedSession: SessionDetailDTO = {
      ...sessionWithDevice,
      status: 'completed',
    };
    vi.mocked(useSession).mockReturnValue(makeSessionMock(completedSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Operator Console')).toBeInTheDocument();
      expect(screen.getByText('Session is not active — actions disabled')).toBeInTheDocument();
    });

    // Recenter button should be disabled
    const recenterBtn = screen.getByText('Recenter View').closest('button');
    expect(recenterBtn).toBeDisabled();
  });

  it('patient does not see OperatorConsole', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      // Session loaded successfully
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Operator Console')).not.toBeInTheDocument();
  });

  it('Recenter View button calls commandsApi.recenterView with device_id and session_id', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Recenter View')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recenter View'));

    await waitFor(() => {
      expect(commandsApi.recenterView).toHaveBeenCalledWith(
        'dev-abc',
        'sess-1234-5678-abcd-efgh',
      );
    });
  });

  it('End Session button calls commandsApi.endSession after confirmation', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('End Session')).toBeInTheDocument();
    });

    // First click shows confirmation
    fireEvent.click(screen.getByText('End Session'));

    await waitFor(() => {
      expect(screen.getByText('Yes, end')).toBeInTheDocument();
    });

    // Confirm
    fireEvent.click(screen.getByText('Yes, end'));

    await waitFor(() => {
      expect(commandsApi.endSession).toHaveBeenCalledWith(
        'dev-abc',
        'sess-1234-5678-abcd-efgh',
      );
    });
  });

  it('command error shows inline message', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(commandsApi.recenterView).mockRejectedValue(
      new Error('Device unreachable'),
    );

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Recenter View')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recenter View'));

    await waitFor(() => {
      expect(screen.getByText('Device unreachable')).toBeInTheDocument();
    });
  });

  it('command history panel shows commands from mock with correct sessionId', async () => {
    const mockCommands = [
      {
        command_id: 'cmd-hist-1',
        command_name: 'command.recenter_view',
        status: 'executed' as const,
        device_id: 'dev-abc',
        issued_by_user_id: null,
        sent_at: '2025-05-01T10:05:00Z',
        executed_at: '2025-05-01T10:05:01Z',
        error_message: null,
      },
    ];
    vi.mocked(commandsApi.listCommands).mockResolvedValue({
      data: mockCommands,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(commandsApi.listCommands).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess-1234-5678-abcd-efgh' }),
      );
      // The command name should appear (stripped of prefix)
      expect(screen.getByText('recenter_view')).toBeInTheDocument();
    });
  });

  it('Refresh button reloads command history', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh command history')).toBeInTheDocument();
    });

    const callsBefore = vi.mocked(commandsApi.listCommands).mock.calls.length;

    fireEvent.click(screen.getByLabelText('Refresh command history'));

    await waitFor(() => {
      expect(vi.mocked(commandsApi.listCommands).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});

// ----- Tests: Session Events Panel -----

describe('Session Events Panel', () => {
  it('admin with session running renders "Session Events" section', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Events')).toBeInTheDocument();
    });
  });

  it('patient does not see "Session Events" section', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Session Events')).not.toBeInTheDocument();
  });

  it('shows event_type and occurred_at when events are present', async () => {
    const mockEvents = [
      {
        event_id: 'evt-001',
        session_id: 'sess-1234-5678-abcd-efgh',
        device_id: 'dev-abc-xyz-1234',
        event_type: 'session.started',
        payload: {},
        occurred_at: '2025-05-01T10:00:00Z',
        created_at: '2025-05-01T10:00:00Z',
      },
    ];
    vi.mocked(sessionsApi.listEvents).mockResolvedValue({
      data: mockEvents,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('session.started')).toBeInTheDocument();
      // device_id first 8 chars
      expect(screen.getByText('dev-abc-')).toBeInTheDocument();
    });
  });

  it('shows "No events yet" when event list is empty', async () => {
    vi.mocked(sessionsApi.listEvents).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('No events yet')).toBeInTheDocument();
    });
  });

  it('shows "Failed to load events" when listEvents rejects', async () => {
    vi.mocked(sessionsApi.listEvents).mockRejectedValue(new Error('Network error'));
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load events')).toBeInTheDocument();
    });
  });

  it('Refresh button calls listEvents again', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh session events')).toBeInTheDocument();
    });

    const callsBefore = vi.mocked(sessionsApi.listEvents).mock.calls.length;

    fireEvent.click(screen.getByLabelText('Refresh session events'));

    await waitFor(() => {
      expect(vi.mocked(sessionsApi.listEvents).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});

// ----- Tests: Session Timeline Panel -----

describe('Session Timeline Panel', () => {
  it('admin with session running renders "Session Timeline"', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Timeline')).toBeInTheDocument();
    });
  });

  it('patient does not see "Session Timeline"', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Session Timeline')).not.toBeInTheDocument();
  });

  it('renders title and summary for kind "command" items', async () => {
    const mockItems = [
      {
        timeline_id: 'tl-cmd-1',
        kind: 'command' as const,
        timestamp: '2025-05-01T10:23:01Z',
        title: 'command.recenter_view',
        status: 'sent',
        device_id: 'dev-abc',
        session_id: 'sess-1234-5678-abcd-efgh',
        patient_id: 'p-1111',
        summary: 'Recenter view command sent',
        details: {},
        error_message: null,
      },
    ];
    vi.mocked(sessionsApi.listTimeline).mockResolvedValue({
      data: mockItems,
      pagination: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('command.recenter_view')).toBeInTheDocument();
      expect(screen.getByText('Recenter view command sent')).toBeInTheDocument();
    });

    // command badge should be blue style
    const commandBadge = screen.getByText('command');
    expect(commandBadge.className).toContain('blue');
  });

  it('renders title with green badge for kind "event" items', async () => {
    const mockItems = [
      {
        timeline_id: 'tl-evt-1',
        kind: 'event' as const,
        timestamp: '2025-05-01T10:22:45Z',
        title: 'session.metric.received',
        status: null,
        device_id: null,
        session_id: 'sess-1234-5678-abcd-efgh',
        patient_id: null,
        summary: 'Metric data received',
        details: {},
        error_message: null,
      },
    ];
    vi.mocked(sessionsApi.listTimeline).mockResolvedValue({
      data: mockItems,
      pagination: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('session.metric.received')).toBeInTheDocument();
    });

    // event badge should be green style
    const eventBadge = screen.getByText('event');
    expect(eventBadge.className).toContain('green');
  });

  it('shows error_message in red when present', async () => {
    const mockItems = [
      {
        timeline_id: 'tl-err-1',
        kind: 'command' as const,
        timestamp: '2025-05-01T10:20:00Z',
        title: 'command.end_session',
        status: 'failed',
        device_id: 'dev-abc',
        session_id: 'sess-1234-5678-abcd-efgh',
        patient_id: null,
        summary: 'End session command failed',
        details: {},
        error_message: 'Device not reachable',
      },
    ];
    vi.mocked(sessionsApi.listTimeline).mockResolvedValue({
      data: mockItems,
      pagination: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      const errMsg = screen.getByText('Device not reachable');
      expect(errMsg).toBeInTheDocument();
      expect(errMsg.className).toContain('red');
    });
  });

  it('shows "No timeline entries yet" when list is empty', async () => {
    vi.mocked(sessionsApi.listTimeline).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
    });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('No timeline entries yet')).toBeInTheDocument();
    });
  });

  it('shows "Failed to load timeline" when listTimeline rejects', async () => {
    vi.mocked(sessionsApi.listTimeline).mockRejectedValue(new Error('Network error'));
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load timeline')).toBeInTheDocument();
    });
  });

  it('filter button "Commands" calls listTimeline with type: "command"', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Timeline')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Commands'));

    await waitFor(() => {
      expect(sessionsApi.listTimeline).toHaveBeenCalledWith(
        'sess-1234-5678-abcd-efgh',
        expect.objectContaining({ type: 'command' }),
      );
    });
  });
});

// ----- Tests: View Report link -----

describe('SessionDetailPage — View Report link', () => {
  it('admin sees "View Report" link', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('View Report')).toBeInTheDocument();
    });
  });

  it('patient does NOT see "View Report" link', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('View Report')).not.toBeInTheDocument();
  });
});

// ----- Tests: Session Summary Panel -----

const mockSummary = {
  session_id: 'sess-1',
  patient: { patient_id: 'pat-1', first_name: 'Juan', last_name: 'García' },
  therapist: { user_id: 'user-1', name: 'Dr. López', email: 'dr@test.com' },
  device: { device_id: 'dev-1', device_name: 'Quest Pro', serial_number: 'A1B2' },
  status: 'running',
  started_at: '2026-05-18T10:00:00Z',
  ended_at: undefined,
  duration_seconds: undefined,
  metrics: {
    total_events: 3, total_metrics: 2, total_commands: 5,
    delivered_commands: 4, failed_commands: 0, timeout_commands: 1,
    last_score: 87, total_repetitions: 10, elapsed_seconds: 45,
  },
  highlights: ['2 metric events received', 'Last recorded score: 87', '4 commands completed successfully'],
  warnings: ['1 command(s) timed out'],
  generated_at: '2026-05-18T10:01:00Z',
};

describe('Session Summary Panel', () => {
  it('admin sees "Session Summary" panel', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue(mockSummary);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Summary')).toBeInTheDocument();
    });
  });

  it('patient does not see "Session Summary" panel', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Session Summary')).not.toBeInTheDocument();
  });

  it('shows patient name from summary', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue(mockSummary);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Juan García')).toBeInTheDocument();
    });
  });

  it('shows assigned device name and serial', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue(mockSummary);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Quest Pro #A1B2')).toBeInTheDocument();
    });
  });

  it('shows highlights list', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue(mockSummary);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('2 metric events received')).toBeInTheDocument();
      expect(screen.getByText('Last recorded score: 87')).toBeInTheDocument();
      expect(screen.getByText('4 commands completed successfully')).toBeInTheDocument();
    });
  });

  it('shows warnings list', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue(mockSummary);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('1 command(s) timed out')).toBeInTheDocument();
    });
  });

  it('does not show warnings section when warnings array is empty', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue({
      ...mockSummary,
      warnings: [],
    });

    render(<SessionDetailPage />);

    await waitFor(() => {
      // Highlights still visible
      expect(screen.getByText('2 metric events received')).toBeInTheDocument();
    });

    // Warnings heading should not appear
    expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
  });

  it('shows "Failed to load summary" when getSummary rejects', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockRejectedValue(new Error('Network error'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load summary')).toBeInTheDocument();
    });
  });

  it('Refresh button calls getSummary again', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(sessionWithDevice));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getSummary).mockResolvedValue(mockSummary);

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh summary')).toBeInTheDocument();
    });

    const callsBefore = vi.mocked(sessionsApi.getSummary).mock.calls.length;

    fireEvent.click(screen.getByLabelText('Refresh summary'));

    await waitFor(() => {
      expect(vi.mocked(sessionsApi.getSummary).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
