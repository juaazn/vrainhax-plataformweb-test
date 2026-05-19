import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SessionDetailPage from './page';
import type { SessionDetailDTO } from '@/types/api';

// Mock next/navigation
const mockParams = { sessionId: 'sess-action-bar-test' };
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

// Mock sessionsApi — include all methods used by the page
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
    getSummary: vi.fn().mockResolvedValue({
      session_id: 'sess-action-bar-test',
      patient: { patient_id: 'pat-1', first_name: 'Ana', last_name: 'Lopez' },
      therapist: { user_id: 'user-1', name: 'Dr. Test', email: 'dr@test.com' },
      device: undefined,
      status: 'pending',
      started_at: undefined,
      ended_at: undefined,
      duration_seconds: undefined,
      metrics: {
        total_events: 0, total_metrics: 0, total_commands: 0,
        delivered_commands: 0, failed_commands: 0, timeout_commands: 0,
      },
      highlights: [],
      warnings: [],
      generated_at: '2026-05-19T10:00:00Z',
    }),
    getReport: vi.fn().mockResolvedValue({}),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  },
}));

// Mock commandsApi
vi.mock('@/lib/api/commands-api', () => ({
  commandsApi: {
    listCommands: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
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

// ----- Fixtures -----

const baseSession: SessionDetailDTO = {
  session_id: 'sess-action-bar-test',
  patient_id: 'p-1',
  therapist_id: null,
  device_id: null,
  variant_id: 'var-1',
  status: 'pending',
  started_at: null,
  ended_at: null,
  difficulty: null,
  score_value: null,
  completed: false,
  pain_before: null,
  pain_after: null,
  config: {},
  metrics: {},
  created_at: '2026-05-19T09:00:00Z',
  patient: { first_name: 'Ana', last_name: 'Lopez' },
  device: null,
};

const pendingSession: SessionDetailDTO = { ...baseSession, status: 'pending' };
const runningSession: SessionDetailDTO = { ...baseSession, status: 'running', started_at: '2026-05-19T10:00:00Z' };
const completedSession: SessionDetailDTO = { ...baseSession, status: 'completed', ended_at: '2026-05-19T11:00:00Z' };

function makeSessionMock(session: SessionDetailDTO | null): ReturnType<typeof useSession> {
  return {
    session,
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

function makeDevicesMock() {
  return { devices: [], isLoading: false, error: null, reload: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDevices).mockReturnValue(makeDevicesMock());
});

// ----- Tests -----

describe('SessionActionBar', () => {
  it('renders "Iniciar sesión" button when session status is pending', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(pendingSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Actions')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finalizar sesión' })).not.toBeInTheDocument();
  });

  it('renders "Finalizar sesión" button when session status is running', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(runningSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Actions')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Finalizar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
  });

  it('renders nothing (no "Session Actions" heading) when session status is completed', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(completedSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      // Session loaded — patient name is visible
      expect(screen.getByText(/Ana Lopez/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Session Actions')).not.toBeInTheDocument();
  });

  it('"Cancelar sesión" shows confirmation UI when clicked', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(pendingSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar sesión' }));

    await waitFor(() => {
      expect(screen.getByText('¿Confirmar cancelación?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sí, cancelar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    });

    // The original "Cancelar sesión" button should be gone (replaced by confirmation UI)
    expect(screen.queryByRole('button', { name: 'Cancelar sesión' })).not.toBeInTheDocument();
  });

  it('"Sí, cancelar" calls sessionsApi.cancel and calls onSessionUpdated', async () => {
    const cancelledSession: SessionDetailDTO = { ...pendingSession, status: 'cancelled' };
    vi.mocked(sessionsApi.cancel).mockResolvedValue({ session: cancelledSession });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(pendingSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar sesión' })).toBeInTheDocument();
    });

    // Open confirmation
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sí, cancelar' })).toBeInTheDocument();
    });

    // Confirm cancellation
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));

    await waitFor(() => {
      expect(sessionsApi.cancel).toHaveBeenCalledWith('sess-action-bar-test');
    });

    // After cancellation, the action bar should disappear (status is now cancelled)
    await waitFor(() => {
      expect(screen.queryByText('Session Actions')).not.toBeInTheDocument();
    });
  });

  // --- Readiness guardrail error messages (Feature #35) ---

  it('muestra mensaje PATIENT_INACTIVE al iniciar sesion con paciente dado de baja', async () => {
    const { ApiError } = await import('@/lib/api');
    vi.mocked(sessionsApi.start).mockRejectedValue(
      new ApiError(409, 'PATIENT_INACTIVE', 'Patient not active'),
    );
    vi.mocked(useSession).mockReturnValue(makeSessionMock(pendingSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/paciente asignado está dado de baja/i);
    });
  });

  it('muestra mensaje INVALID_CONFIG al iniciar sesion sin configuracion', async () => {
    const { ApiError } = await import('@/lib/api');
    vi.mocked(sessionsApi.start).mockRejectedValue(
      new ApiError(400, 'INVALID_CONFIG', 'Session has no configuration'),
    );
    vi.mocked(useSession).mockReturnValue(makeSessionMock(pendingSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/configuración inválida/i);
    });
  });

  it('muestra mensaje DEVICE_ALREADY_IN_USE al iniciar sesion con dispositivo ocupado', async () => {
    const { ApiError } = await import('@/lib/api');
    vi.mocked(sessionsApi.start).mockRejectedValue(
      new ApiError(409, 'DEVICE_ALREADY_IN_USE', 'Device already in use'),
    );
    vi.mocked(useSession).mockReturnValue(makeSessionMock(pendingSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/dispositivo ya está en uso/i);
    });
  });

  it('"Finalizar sesión" shows confirmation UI when clicked', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(runningSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finalizar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar sesión' }));

    await waitFor(() => {
      expect(screen.getByText('¿Confirmar finalización?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sí, finalizar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Finalizar sesión' })).not.toBeInTheDocument();
  });

  it('"No" in finalizar confirmation restores the original button', async () => {
    vi.mocked(useSession).mockReturnValue(makeSessionMock(runningSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finalizar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finalizar sesión' })).toBeInTheDocument();
    });
    expect(screen.queryByText('¿Confirmar finalización?')).not.toBeInTheDocument();
  });

  it('"Sí, finalizar" calls sessionsApi.complete', async () => {
    const completedResult: SessionDetailDTO = { ...runningSession, status: 'completed', ended_at: '2026-05-19T11:00:00Z' };
    vi.mocked(sessionsApi.complete).mockResolvedValue({ session: completedResult });
    vi.mocked(useSession).mockReturnValue(makeSessionMock(runningSession));
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Finalizar sesión' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sí, finalizar' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

    await waitFor(() => {
      expect(sessionsApi.complete).toHaveBeenCalledWith('sess-action-bar-test');
    });
  });
});
