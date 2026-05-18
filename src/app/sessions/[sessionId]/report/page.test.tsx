import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SessionReportPage from './page';

// Mock next/navigation (not used in report page but Link needs it)
vi.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'sess-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock useAuth
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock sessionsApi
vi.mock('@/lib/api/sessions-api', () => ({
  sessionsApi: {
    getReport: vi.fn().mockResolvedValue({
      report_id: 'rep-1',
      session_id: 'sess-1',
      generated_at: '2026-05-18T10:01:00Z',
      patient: { patient_id: 'pat-1', first_name: 'Juan', last_name: 'García' },
      therapist: { user_id: 'user-1', name: 'Dr. López', email: 'dr@test.com' },
      device: { device_id: 'dev-1', device_name: 'Quest Pro', serial_number: 'A1B2' },
      session: {
        status: 'completed',
        started_at: '2026-05-18T09:00:00Z',
        ended_at: '2026-05-18T10:00:00Z',
        duration_seconds: 3600,
      },
      summary: {
        total_events: 3,
        total_metrics: 2,
        total_commands: 5,
        delivered_commands: 4,
        failed_commands: 1,
        timeout_commands: 0,
        last_score: 87,
        total_repetitions: 10,
        elapsed_seconds: 45,
        highlights: ['2 metric events received', 'Last score: 87'],
        warnings: ['1 command(s) failed'],
      },
      timeline: [],
      sections: [{ title: 'Failed Commands', items: ['command.recenter_view — failed'] }],
    }),
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

import { useAuth } from '@/features/auth/use-auth';
import { sessionsApi } from '@/lib/api/sessions-api';
import { ApiError } from '@/lib/api';

const mockParams = { sessionId: 'sess-1' };

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sessionsApi.getReport).mockResolvedValue({
    report_id: 'rep-1',
    session_id: 'sess-1',
    generated_at: '2026-05-18T10:01:00Z',
    patient: { patient_id: 'pat-1', first_name: 'Juan', last_name: 'García' },
    therapist: { user_id: 'user-1', name: 'Dr. López', email: 'dr@test.com' },
    device: { device_id: 'dev-1', device_name: 'Quest Pro', serial_number: 'A1B2' },
    session: {
      status: 'completed',
      started_at: '2026-05-18T09:00:00Z',
      ended_at: '2026-05-18T10:00:00Z',
      duration_seconds: 3600,
    },
    summary: {
      total_events: 3,
      total_metrics: 2,
      total_commands: 5,
      delivered_commands: 4,
      failed_commands: 1,
      timeout_commands: 0,
      last_score: 87,
      total_repetitions: 10,
      elapsed_seconds: 45,
      highlights: ['2 metric events received', 'Last score: 87'],
      warnings: ['1 command(s) failed'],
    },
    timeline: [],
    sections: [{ title: 'Failed Commands', items: ['command.recenter_view — failed'] }],
  });
});

describe('SessionReportPage', () => {
  it('admin renders "Session Report" with patient name', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText(/VRAINHAX — Session Report/i)).toBeInTheDocument();
      expect(screen.getByText(/Juan García/)).toBeInTheDocument();
    });
  });

  it('patient sees "Access denied" and report is not fetched', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });

    expect(sessionsApi.getReport).not.toHaveBeenCalled();
  });

  it('therapist sees highlights', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('2 metric events received')).toBeInTheDocument();
      expect(screen.getByText('Last score: 87')).toBeInTheDocument();
    });
  });

  it('admin sees warnings', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('1 command(s) failed')).toBeInTheDocument();
    });
  });

  it('admin sees sections when data is present', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Failed Commands')).toBeInTheDocument();
      expect(screen.getByText('command.recenter_view — failed')).toBeInTheDocument();
    });
  });

  it('Print / Save as PDF button is present for admin', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Print \/ Save as PDF/i })).toBeInTheDocument();
    });
  });

  it('shows "Loading report..." while loading', () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    // Make getReport never resolve during this test
    vi.mocked(sessionsApi.getReport).mockReturnValue(new Promise(() => {}));

    render(<SessionReportPage params={mockParams} />);

    expect(screen.getByText('Loading report...')).toBeInTheDocument();
  });

  it('shows "Session not found" on 404 error', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getReport).mockRejectedValue(
      new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found'),
    );

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Session not found')).toBeInTheDocument();
    });
  });

  it('shows "Please log in" on 401 error', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getReport).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'),
    );

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Please log in')).toBeInTheDocument();
    });
  });

  it('shows "Access denied" on 403 error', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getReport).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Forbidden'),
    );

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('shows "Failed to load report" on generic error', async () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));
    vi.mocked(sessionsApi.getReport).mockRejectedValue(new Error('Network error'));

    render(<SessionReportPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load report')).toBeInTheDocument();
    });
  });
});
