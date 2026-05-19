import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientProgressPage from "./page";

// --- Navigation mock ---
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// --- Hook mocks ---
vi.mock("@/lib/hooks/use-patient-progress", () => ({
  usePatientProgress: vi.fn(),
}));

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

// --- ApiError mock ---
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  },
}));

import { usePatientProgress } from "@/lib/hooks/use-patient-progress";
import { useAuth } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SESSION = {
  session_id: "aabbccdd-0000-0000-0000-000000000001",
  status: "completed",
  module_id: "mod-1",
  module_name: "Funcional",
  variant_id: "var-1",
  variant_name: "Standard",
  device_id: null,
  started_at: "2024-06-01T10:00:00Z",
  ended_at: "2024-06-01T10:30:00Z",
  elapsed_seconds: 1800,
  score_value: 85,
  difficulty: 3,
  pain_before: 6,
  pain_after: 3,
  has_metrics: true,
  command_counts: { total: 4, delivered: 4, failed: 0, timeout: 0 },
};

const MOCK_TOTALS = {
  total_sessions: 5,
  pending_sessions: 0,
  running_sessions: 0,
  completed_sessions: 4,
  cancelled_sessions: 1,
  total_elapsed_seconds: 7200,
  total_commands: 20,
  delivered_commands: 18,
  failed_commands: 1,
  timeout_commands: 1,
  sessions_with_metrics: 4,
};

const MOCK_PROGRESS = {
  patient: { patient_id: "pat-001", full_name: "Ana Garcia", active: true },
  filters: {
    date_from: null, date_to: null,
    module_id: null, variant_id: null,
    status: null, limit: 50,
  },
  totals: MOCK_TOTALS,
  sessions: [MOCK_SESSION],
  series: {
    score_over_time: [
      { session_id: MOCK_SESSION.session_id, timestamp: "2024-06-01T10:00:00Z", value: 85 },
    ],
    elapsed_seconds_over_time: [],
    pain_before_after: [],
  },
  warnings: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockLoaded(overrides: Partial<typeof MOCK_PROGRESS> = {}, role = "therapist") {
  vi.mocked(useAuth).mockReturnValue({ user: { role } } as ReturnType<typeof useAuth>);
  vi.mocked(usePatientProgress).mockReturnValue({
    progress: { ...MOCK_PROGRESS, ...overrides },
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

function mockLoading(role = "therapist") {
  vi.mocked(useAuth).mockReturnValue({ user: { role } } as ReturnType<typeof useAuth>);
  vi.mocked(usePatientProgress).mockReturnValue({
    progress: null,
    isLoading: true,
    error: null,
    reload: vi.fn(),
  });
}

function mockError(error: Error, role = "therapist") {
  vi.mocked(useAuth).mockReturnValue({ user: { role } } as ReturnType<typeof useAuth>);
  vi.mocked(usePatientProgress).mockReturnValue({
    progress: null,
    isLoading: false,
    error,
    reload: vi.fn(),
  });
}

const PARAMS = { patientId: "pat-001" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRouterPush.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PatientProgressPage", () => {
  it("muestra estado de carga", () => {
    mockLoading();
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText(/cargando historial/i)).toBeInTheDocument();
  });

  it("muestra nombre del paciente cuando los datos cargan", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText("Ana Garcia")).toBeInTheDocument();
  });

  it("muestra el título Historial de progreso", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByRole("heading", { name: /historial de progreso/i })).toBeInTheDocument();
  });

  it("el enlace 'Volver al paciente' apunta a /patients/:patientId", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    const link = screen.getByRole("link", { name: /volver al paciente/i });
    expect(link).toHaveAttribute("href", "/patients/pat-001");
  });

  it("muestra el total de sesiones en resumen", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("muestra el número de sesiones completadas y con métricas", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    // completed_sessions: 4 y sessions_with_metrics: 4 aparecen ambas en el resumen
    expect(screen.getAllByText("4").length).toBeGreaterThanOrEqual(2);
  });

  it("muestra el último score", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    const scores = screen.getAllByText("85");
    expect(scores.length).toBeGreaterThan(0);
  });

  it("renderiza la tabla de sesiones con módulo y variante", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText("Funcional")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });

  it("la sesión en tabla enlaza a /sessions/:id", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    const link = screen.getByRole("link", { name: /aabbccdd/i });
    expect(link).toHaveAttribute("href", `/sessions/${MOCK_SESSION.session_id}`);
  });

  it("muestra empty state cuando no hay sesiones", () => {
    mockLoaded({ sessions: [] });
    render(<PatientProgressPage params={PARAMS} />);
    expect(
      screen.getByText(/no hay sesiones registradas/i),
    ).toBeInTheDocument();
  });

  it("muestra warnings cuando el DTO los incluye", () => {
    mockLoaded({ warnings: ["Sin métricas registradas"] });
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/sin métricas/i);
  });

  it("muestra acceso denegado para rol patient", () => {
    mockLoaded({}, "patient");
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /volver al paciente/i }),
    ).not.toBeInTheDocument();
  });

  it("muestra error 403", () => {
    mockError(new ApiError(403, "FORBIDDEN", "Forbidden"));
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /volver a pacientes/i });
    fireEvent.click(btn);
    expect(mockRouterPush).toHaveBeenCalledWith("/patients");
  });

  it("muestra error 404 con patientId", () => {
    mockError(new ApiError(404, "NOT_FOUND", "Not found"));
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText(/paciente no encontrado/i)).toBeInTheDocument();
    expect(screen.getByText(/pat-001/)).toBeInTheDocument();
  });

  it("muestra error 401 con link al login", () => {
    mockError(new ApiError(401, "UNAUTHORIZED", "Unauthorized"));
    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText(/sesión expirada/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir al login/i })).toBeInTheDocument();
  });

  it("muestra error genérico con botón reintentar", () => {
    const reload = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: { role: "admin" } } as ReturnType<typeof useAuth>);
    vi.mocked(usePatientProgress).mockReturnValue({
      progress: null,
      isLoading: false,
      error: new Error("Network error"),
      reload,
    });

    render(<PatientProgressPage params={PARAMS} />);
    expect(screen.getByText("Network error")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("usePatientProgress se llama con limit 50", () => {
    mockLoaded();
    render(<PatientProgressPage params={PARAMS} />);
    expect(vi.mocked(usePatientProgress)).toHaveBeenCalledWith("pat-001", { limit: 50 });
  });
});
