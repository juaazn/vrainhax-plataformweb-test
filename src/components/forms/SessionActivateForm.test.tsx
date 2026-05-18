import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionActivateForm } from './SessionActivateForm';
import type { PatientDTO, DeviceDTO, SessionDTO } from '@/types/api';

// --- Mocks ---

vi.mock('@/lib/hooks/use-patients', () => ({
  usePatients: vi.fn(),
}));

vi.mock('@/lib/hooks/use-devices', () => ({
  useDevices: vi.fn(),
}));

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    sessionsApi: { activate: vi.fn() },
    ApiError,
  };
});

import { usePatients } from '@/lib/hooks/use-patients';
import { useDevices } from '@/lib/hooks/use-devices';
import { sessionsApi, ApiError } from '@/lib/api';

// --- Fixtures ---

const mockPatients: PatientDTO[] = [
  {
    patient_id: 'p1',
    user_id: null,
    first_name: 'Ana',
    last_name: 'Lopez',
    birth_date: null,
    gender: null,
    contact_email: null,
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deactivated_at: null,
  },
  {
    patient_id: 'p2',
    user_id: null,
    first_name: 'Juan',
    last_name: 'Garcia',
    birth_date: null,
    gender: null,
    contact_email: null,
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deactivated_at: null,
  },
];

const mockDevices: DeviceDTO[] = [
  {
    device_id: 'd1',
    device_name: 'Sensor A',
    device_type: 'imu',
    serial_number: 'SN-001',
    active: true,
    firmware_version: null,
    notes: null,
    registered_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
    last_seen_at: null,
    last_connected_at: null,
    last_authenticated_at: null,
    device_secret_last_rotated_at: null,
  },
];

const mockSession: SessionDTO = {
  session_id: 'sess-1',
  patient_id: 'p1',
  therapist_id: null,
  device_id: null,
  variant_id: 'var-1',
  status: 'running',
  started_at: null,
  ended_at: null,
  difficulty: null,
  score_value: null,
  completed: false,
  pain_before: null,
  pain_after: null,
  config: { difficulty: 5 },
  metrics: {},
  created_at: '2024-01-01T00:00:00Z',
};

const emptySchema = {
  type: 'object' as const,
  properties: {},
};

// --- Helpers ---

function setupHooks({
  patientsLoading = false,
  devicesLoading = false,
}: {
  patientsLoading?: boolean;
  devicesLoading?: boolean;
} = {}) {
  vi.mocked(usePatients).mockReturnValue({
    patients: mockPatients,
    isLoading: patientsLoading,
    error: null,
    reload: vi.fn(),
  });
  vi.mocked(useDevices).mockReturnValue({
    devices: mockDevices,
    isLoading: devicesLoading,
    error: null,
    reload: vi.fn(),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// --- Tests ---

describe('SessionActivateForm', () => {
  it('renders patient selector with mocked data', () => {
    setupHooks();
    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    const select = screen.getByLabelText(/paciente/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ana lopez/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /juan garcia/i })).toBeInTheDocument();
  });

  it('renders device selector with empty option', () => {
    setupHooks();
    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    expect(screen.getByRole('option', { name: /sin dispositivo/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /sensor a \(imu\)/i })).toBeInTheDocument();
  });

  it('shows error when submitting without selecting a patient', async () => {
    setupHooks();
    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    const submitBtn = screen.getByRole('button', { name: /activar sesion/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/selecciona un paciente/i);
    });
    expect(sessionsApi.activate).not.toHaveBeenCalled();
  });

  it('calls sessionsApi.activate with correct payload', async () => {
    setupHooks();
    vi.mocked(sessionsApi.activate).mockResolvedValue({
      session: mockSession,
    });

    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    // Select patient
    const patientSelect = screen.getByLabelText(/paciente/i);
    fireEvent.change(patientSelect, { target: { value: 'p1' } });

    // Submit (empty config schema → no extra fields)
    const submitBtn = screen.getByRole('button', { name: /activar sesion/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sessionsApi.activate).toHaveBeenCalledWith({
        patientId: 'p1',
        variantId: 'var-1',
        deviceId: undefined,
        config: {},
      });
    });
  });

  it('calls onSuccess with response.session on happy path', async () => {
    setupHooks();
    const onSuccess = vi.fn();
    vi.mocked(sessionsApi.activate).mockResolvedValue({
      session: mockSession,
    });

    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={onSuccess} />,
    );

    fireEvent.change(screen.getByLabelText(/paciente/i), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: /activar sesion/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockSession);
    });
  });

  it('shows 409 error message when device is already in use', async () => {
    setupHooks();
    vi.mocked(sessionsApi.activate).mockRejectedValue(
      new ApiError(409, 'DEVICE_BUSY', 'Device in use'),
    );

    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/paciente/i), { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText(/dispositivo/i), { target: { value: 'd1' } });
    fireEvent.click(screen.getByRole('button', { name: /activar sesion/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /el dispositivo ya esta en uso en otra sesion/i,
      );
    });
  });

  it('shows 401 error message when session is expired', async () => {
    setupHooks();
    vi.mocked(sessionsApi.activate).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'),
    );

    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/paciente/i), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: /activar sesion/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/sesion expirada/i);
    });
  });

  it('shows loading text while patients are loading', () => {
    setupHooks({ patientsLoading: true });
    render(
      <SessionActivateForm variantId="var-1" configSchema={emptySchema} onSuccess={vi.fn()} />,
    );

    expect(screen.getByText(/cargando pacientes/i)).toBeInTheDocument();
  });
});
