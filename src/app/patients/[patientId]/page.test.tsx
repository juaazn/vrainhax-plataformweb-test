import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientDetailPage from "./page";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/lib/hooks/use-patient", () => ({ usePatient: vi.fn() }));
vi.mock("@/lib/hooks/use-patient-progress", () => ({ usePatientProgress: vi.fn() }));
vi.mock("@/features/auth/use-auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/api", () => ({
  patientsApi: { deactivate: vi.fn(), reactivate: vi.fn() },
  ApiError: class ApiError extends Error {
    status: number; code: string;
    constructor(status: number, code: string, message: string) {
      super(message); this.name = "ApiError"; this.status = status; this.code = code;
    }
  },
}));

import { usePatient } from "@/lib/hooks/use-patient";
import { usePatientProgress } from "@/lib/hooks/use-patient-progress";
import { useAuth } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";

const MOCK_PATIENT = {
  patient_id: "pat-001", user_id: null, first_name: "Ana", last_name: "Garcia",
  birth_date: "1990-05-15", gender: "Femenino", contact_email: "ana@example.com",
  description: "Diagnóstico: hombro", active: true,
  created_at: "2024-01-10T10:00:00Z", updated_at: "2024-01-10T10:00:00Z", deactivated_at: null,
};

const MOCK_SESSION = {
  session_id: "aabbccdd-0000-0000-0000-000000000001", status: "completed",
  module_id: "mod-1", module_name: "Funcional", variant_id: "var-1", variant_name: "Standard",
  device_id: null, started_at: "2024-06-01T10:00:00Z", ended_at: "2024-06-01T10:30:00Z",
  elapsed_seconds: 1800, score_value: 85, difficulty: 3, pain_before: 6, pain_after: 3,
  has_metrics: true, command_counts: { total: 4, delivered: 4, failed: 0, timeout: 0 },
};

const MOCK_TOTALS = {
  total_sessions: 5, pending_sessions: 0, running_sessions: 0, completed_sessions: 4,
  cancelled_sessions: 1, total_elapsed_seconds: 7200, total_commands: 20,
  delivered_commands: 18, failed_commands: 1, timeout_commands: 1, sessions_with_metrics: 4,
};

const MOCK_PROGRESS = {
  patient: { patient_id: "pat-001", full_name: "Ana Garcia", active: true },
  filters: { date_from: null, date_to: null, module_id: null, variant_id: null, status: null, limit: 10 },
  totals: MOCK_TOTALS,
  sessions: [MOCK_SESSION],
  series: {
    score_over_time: [{ session_id: MOCK_SESSION.session_id, timestamp: "2024-06-01T10:00:00Z", value: 85 }],
    elapsed_seconds_over_time: [], pain_before_after: [],
  },
  warnings: [],
};

function setup({ patientOverride = {}, role = "therapist", progressOverride = MOCK_PROGRESS, patientError = null } = {}) {
  (usePatient as ReturnType<typeof vi.fn>).mockReturnValue({
    patient: patientError ? null : { ...MOCK_PATIENT, ...patientOverride },
    isLoading: false, error: patientError, reload: vi.fn(),
  });
  (usePatientProgress as ReturnType<typeof vi.fn>).mockReturnValue({
    progress: progressOverride, isLoading: false, error: null, reload: vi.fn(),
  });
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { role } });
}

describe("PatientDetailPage — workspace clínico", () => {
  beforeEach(() => { mockRouterPush.mockClear(); });

  it("renderiza el nombre completo del paciente", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText("Ana Garcia")).toBeInTheDocument();
  });

  it("muestra estado Activo", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("muestra estado Inactivo cuando el paciente no está activo", () => {
    setup({ patientOverride: { active: false } });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("muestra la fecha de nacimiento", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText(/1990|mayo/i)).toBeInTheDocument();
  });

  it("muestra el email de contacto", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  it("tiene enlace 'Nueva sesión' con patientId en la URL", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    const link = screen.getByRole("link", { name: /nueva sesión/i });
    expect(link).toHaveAttribute("href", "/sessions/new?patientId=pat-001");
  });

  it("tiene enlace al historial completo (progress)", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    const links = screen.getAllByRole("link", { name: /historial completo/i });
    expect(links[0]).toHaveAttribute("href", "/patients/pat-001/progress");
  });

  it("muestra botón 'Dar de baja' cuando el paciente está activo", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByRole("button", { name: /dar de baja/i })).toBeInTheDocument();
  });

  it("'Dar de baja' muestra confirmación inline antes de ejecutar", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.queryByText(/confirmar baja/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    expect(screen.getByText(/confirmar baja/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sí, dar de baja/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^no$/i })).toBeInTheDocument();
  });

  it("'No' en confirmación de baja cancela y restaura el botón", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    fireEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    fireEvent.click(screen.getByRole("button", { name: /^no$/i }));
    expect(screen.queryByText(/confirmar baja/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dar de baja/i })).toBeInTheDocument();
  });

  it("muestra botón Reactivar para admin cuando paciente está inactivo", () => {
    setup({ patientOverride: { active: false }, role: "admin" });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByRole("button", { name: /reactivar/i })).toBeInTheDocument();
  });

  it("therapist no ve botón Reactivar en paciente inactivo", () => {
    setup({ patientOverride: { active: false }, role: "therapist" });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.queryByRole("button", { name: /reactivar/i })).not.toBeInTheDocument();
  });

  it("renderiza el total de sesiones en el resumen", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText("Resumen de progreso")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("muestra el último score disponible", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getAllByText("85").length).toBeGreaterThan(0);
  });

  it("muestra advertencias de progreso si existen", () => {
    setup({ progressOverride: { ...MOCK_PROGRESS, warnings: ["Sin métricas registradas"] } });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText(/sin métricas/i)).toBeInTheDocument();
  });

  it("renderiza enlace a la sesión reciente", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    const link = screen.getByRole("link", { name: /aabbccdd/i });
    expect(link).toHaveAttribute("href", `/sessions/${MOCK_SESSION.session_id}`);
  });

  it("muestra el módulo y la variante de la sesión reciente", () => {
    setup(); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText("Funcional")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });

  it("muestra mensaje vacío cuando no hay sesiones", () => {
    setup({ progressOverride: { ...MOCK_PROGRESS, sessions: [] } });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText(/no hay sesiones/i)).toBeInTheDocument();
  });

  it("rol patient NO ve acciones rápidas ni resumen clínico", () => {
    setup({ role: "patient" }); render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.queryByRole("link", { name: /nueva sesión/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Resumen de progreso")).not.toBeInTheDocument();
  });

  it("muestra estado 403 correctamente", () => {
    setup({ patientError: new ApiError(403, "FORBIDDEN", "Forbidden") });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument();
  });

  it("muestra estado 404 correctamente", () => {
    setup({ patientError: new ApiError(404, "NOT_FOUND", "Not found") });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText(/no encontrado/i)).toBeInTheDocument();
  });

  it("muestra estado 401 con enlace de login", () => {
    setup({ patientError: new ApiError(401, "UNAUTHORIZED", "Unauthorized") });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByText(/sesión expirada/i)).toBeInTheDocument();
  });

  it("muestra botón Editar para rol autorizado", () => {
    setup({ role: "therapist" });
    render(<PatientDetailPage params={{ patientId: "pat-001" }} />);
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });
});
