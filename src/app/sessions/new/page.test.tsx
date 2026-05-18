import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewSessionPage from './page';

// --- Navigation mock ---
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// --- Auth mock ---
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

// --- Hook mocks ---
vi.mock('@/lib/hooks/use-patients', () => ({
  usePatients: vi.fn(),
}));
vi.mock('@/lib/hooks/use-modules', () => ({
  useModules: vi.fn(),
}));
vi.mock('@/lib/hooks/use-variant-schema', () => ({
  useVariantSchema: vi.fn(),
}));
vi.mock('@/lib/hooks/use-patient-variant-settings', () => ({
  usePatientVariantSettings: vi.fn(),
}));
vi.mock('@/lib/hooks/use-devices', () => ({
  useDevices: vi.fn(),
}));

// --- API mocks ---
vi.mock('@/lib/api', () => ({
  sessionsApi: {
    activate: vi.fn(),
  },
  patientVariantSettingsApi: {
    put: vi.fn(),
    get: vi.fn(),
  },
  modulesApi: {
    listVariants: vi.fn(),
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

// --- DynamicConfigForm mock (keeps test simple) ---
vi.mock('@/components/forms/DynamicConfigForm', () => ({
  DynamicConfigForm: ({ onSubmit, submitLabel }: { onSubmit: (c: Record<string, unknown>) => void; submitLabel?: string }) => (
    <div data-testid="dynamic-config-form">
      <button
        type="button"
        onClick={() => onSubmit({ difficulty: 3 })}
      >
        {submitLabel ?? 'Submit'}
      </button>
    </div>
  ),
}));

// --- Imports after mocks ---
import { useAuth } from '@/features/auth/use-auth';
import { usePatients } from '@/lib/hooks/use-patients';
import { useModules } from '@/lib/hooks/use-modules';
import { useVariantSchema } from '@/lib/hooks/use-variant-schema';
import { usePatientVariantSettings } from '@/lib/hooks/use-patient-variant-settings';
import { useDevices } from '@/lib/hooks/use-devices';
import { sessionsApi, modulesApi, ApiError } from '@/lib/api';

// --- Fixtures ---

const mockPatients = [
  {
    patient_id: 'p-1',
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
];

const mockModules = [
  {
    module_id: 'mod-1',
    module_code: 'SHOULDER',
    name: 'Shoulder Rehab',
    description: null,
    type: 'rehabilitation',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    variants: [],
  },
];

const mockVariants = [
  {
    variant_id: 'var-1',
    variant_code: 'SHOULDER_BASIC',
    name: 'Basic',
    description: null,
    score_unit: 'points',
    active: true,
  },
];

const mockSchema = {
  config_schema: {
    type: 'object' as const,
    title: 'Session Config',
    properties: {
      difficulty: { type: 'integer' as const, title: 'Difficulty', minimum: 1, maximum: 10 },
    },
    required: [],
  },
  metrics_schema: [],
  commands: [],
  realtime_events: [],
  variant_id: 'var-1',
  variant_code: 'SHOULDER_BASIC',
  name: 'Basic',
  description: null,
  score_unit: null,
  active: true,
  module: { module_id: 'mod-1', module_code: 'SHOULDER', name: 'Shoulder Rehab' },
};

const mockDevices = [
  {
    device_id: 'dev-1',
    device_name: 'Quest Pro',
    device_type: 'headset',
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

const mockActivateResponse = {
  session: {
    session_id: 'sess-new-1',
    patient_id: 'p-1',
    therapist_id: 'user-1',
    device_id: null,
    variant_id: 'var-1',
    status: 'running' as const,
    started_at: '2026-05-18T10:00:00Z',
    ended_at: null,
    difficulty: null,
    score_value: null,
    completed: false,
    pain_before: null,
    pain_after: null,
    config: {},
    metrics: {},
    created_at: '2026-05-18T10:00:00Z',
  },
};

// --- Default mock implementations ---

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

function setDefaultMocks() {
  vi.mocked(useAuth).mockReturnValue(makeAuthMock('therapist'));
  vi.mocked(usePatients).mockReturnValue({
    patients: mockPatients,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  vi.mocked(useModules).mockReturnValue({
    modules: mockModules,
    isLoading: false,
    error: null,
  });
  vi.mocked(useVariantSchema).mockReturnValue({
    schema: null,
    isLoading: false,
    error: null,
  });
  vi.mocked(usePatientVariantSettings).mockReturnValue({
    settings: null,
    isLoading: false,
    error: null,
  });
  vi.mocked(useDevices).mockReturnValue({
    devices: mockDevices,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  vi.mocked(modulesApi.listVariants).mockResolvedValue(mockVariants);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRouterPush.mockReset();
  setDefaultMocks();
});

// --- Tests ---

describe('NewSessionPage', () => {
  it('patient sees access denied message and not the form', () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<NewSessionPage />);

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.getByText('No tienes permiso para crear sesiones.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Paciente/i)).not.toBeInTheDocument();
  });

  it('patient access denied page has a back to sessions button', () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('patient'));

    render(<NewSessionPage />);

    const btn = screen.getByRole('button', { name: /Volver a Sesiones/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockRouterPush).toHaveBeenCalledWith('/sessions');
  });

  it('therapist sees patient, module, and device selectors', () => {
    render(<NewSessionPage />);

    expect(screen.getByLabelText(/Paciente/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Modulo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dispositivo/)).toBeInTheDocument();
  });

  it('admin also sees the selectors', () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthMock('admin'));

    render(<NewSessionPage />);

    expect(screen.getByLabelText(/Paciente/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Modulo/)).toBeInTheDocument();
  });

  it('renders patients in the patient dropdown', () => {
    render(<NewSessionPage />);

    expect(screen.getByRole('option', { name: /Ana Lopez/i })).toBeInTheDocument();
  });

  it('renders modules in the module dropdown', () => {
    render(<NewSessionPage />);

    expect(screen.getByRole('option', { name: /Shoulder Rehab/i })).toBeInTheDocument();
  });

  it('shows variant selector after selecting a module', async () => {
    render(<NewSessionPage />);

    // Variant select is not shown yet
    expect(screen.queryByLabelText(/Variante/)).not.toBeInTheDocument();

    // Select a module
    fireEvent.change(screen.getByLabelText(/Modulo/), {
      target: { value: 'mod-1' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Variante/)).toBeInTheDocument();
    });
  });

  it('calls modulesApi.listVariants with moduleId when module is selected', async () => {
    render(<NewSessionPage />);

    fireEvent.change(screen.getByLabelText(/Modulo/), {
      target: { value: 'mod-1' },
    });

    await waitFor(() => {
      expect(modulesApi.listVariants).toHaveBeenCalledWith('mod-1', { active: true });
    });
  });

  it('shows config form when a variant is selected and schema is loaded', async () => {
    vi.mocked(useVariantSchema).mockReturnValue({
      schema: mockSchema,
      isLoading: false,
      error: null,
    });

    render(<NewSessionPage />);

    // Select module
    fireEvent.change(screen.getByLabelText(/Modulo/), {
      target: { value: 'mod-1' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Variante/)).toBeInTheDocument();
    });

    // Select variant
    fireEvent.change(screen.getByLabelText(/Variante/), {
      target: { value: 'var-1' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-config-form')).toBeInTheDocument();
    });
  });

  it('"Crear sesion" button is disabled when no patient is selected', async () => {
    render(<NewSessionPage />);

    const activateBtn = screen.getByRole('button', { name: /Crear sesion/i });
    expect(activateBtn).toBeDisabled();
  });

  it('"Crear sesion" button is disabled when no variant is selected', async () => {
    render(<NewSessionPage />);

    // Select patient but no variant
    fireEvent.change(screen.getByLabelText(/Paciente/), {
      target: { value: 'p-1' },
    });

    const activateBtn = screen.getByRole('button', { name: /Crear sesion/i });
    expect(activateBtn).toBeDisabled();
  });

  it('calls sessionsApi.activate and redirects on success', async () => {
    vi.mocked(sessionsApi.activate).mockResolvedValue(mockActivateResponse);
    vi.mocked(useVariantSchema).mockReturnValue({
      schema: mockSchema,
      isLoading: false,
      error: null,
    });

    render(<NewSessionPage />);

    // Select patient
    fireEvent.change(screen.getByLabelText(/Paciente/), {
      target: { value: 'p-1' },
    });

    // Select module
    fireEvent.change(screen.getByLabelText(/Modulo/), {
      target: { value: 'mod-1' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Variante/)).toBeInTheDocument();
    });

    // Select variant
    fireEvent.change(screen.getByLabelText(/Variante/), {
      target: { value: 'var-1' },
    });

    // Click activate
    fireEvent.click(screen.getByRole('button', { name: /Crear sesion/i }));

    await waitFor(() => {
      expect(sessionsApi.activate).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'p-1',
          variantId: 'var-1',
        }),
      );
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/sessions/sess-new-1');
    });
  });

  it('shows 401 error message', async () => {
    vi.mocked(sessionsApi.activate).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'),
    );

    render(<NewSessionPage />);

    // Select patient and variant
    fireEvent.change(screen.getByLabelText(/Paciente/), {
      target: { value: 'p-1' },
    });
    fireEvent.change(screen.getByLabelText(/Modulo/), {
      target: { value: 'mod-1' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Variante/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Variante/), {
      target: { value: 'var-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Crear sesion/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Sesion expirada. Recarga la pagina.',
      );
    });
  });

  it('shows 403 error message', async () => {
    vi.mocked(sessionsApi.activate).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Forbidden'),
    );

    render(<NewSessionPage />);

    fireEvent.change(screen.getByLabelText(/Paciente/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText(/Modulo/), { target: { value: 'mod-1' } });

    await waitFor(() => expect(screen.getByLabelText(/Variante/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Variante/), { target: { value: 'var-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear sesion/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No tienes permiso para crear sesiones.',
      );
    });
  });

  it('shows 409 error message when device is in use', async () => {
    vi.mocked(sessionsApi.activate).mockRejectedValue(
      new ApiError(409, 'DEVICE_IN_USE', 'Device already in use'),
    );

    render(<NewSessionPage />);

    fireEvent.change(screen.getByLabelText(/Paciente/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText(/Modulo/), { target: { value: 'mod-1' } });

    await waitFor(() => expect(screen.getByLabelText(/Variante/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Variante/), { target: { value: 'var-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear sesion/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'El dispositivo ya esta en uso en otra sesion.',
      );
    });
  });

  it('cancel button navigates back to sessions list', () => {
    render(<NewSessionPage />);

    // The top cancel button
    const cancelBtns = screen.getAllByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtns[0]);

    expect(mockRouterPush).toHaveBeenCalledWith('/sessions');
  });

  it('shows loading state for patients', () => {
    vi.mocked(usePatients).mockReturnValue({
      patients: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<NewSessionPage />);

    expect(screen.getByText('Cargando pacientes...')).toBeInTheDocument();
  });

  it('shows loading state for modules', () => {
    vi.mocked(useModules).mockReturnValue({
      modules: [],
      isLoading: true,
      error: null,
    });

    render(<NewSessionPage />);

    expect(screen.getByText('Cargando modulos...')).toBeInTheDocument();
  });

  it('renders devices in device dropdown', () => {
    render(<NewSessionPage />);

    expect(screen.getByRole('option', { name: /Quest Pro/i })).toBeInTheDocument();
  });
});
