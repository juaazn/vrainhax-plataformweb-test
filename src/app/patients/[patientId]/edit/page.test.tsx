import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EditPatientPage from "./page";
import { ApiError } from "@/lib/api";
import type { PatientDTO } from "@/types/api";

// --- Mocks ---

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useParams: () => ({ patientId: "p-abc" }),
}));

const mockRouterPush = vi.fn();

vi.mock("@/lib/api", () => ({
  patientsApi: {
    getById: vi.fn(),
    patch: vi.fn(),
  },
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

import { patientsApi } from "@/lib/api";

// --- Fixtures ---

const mockPatient: PatientDTO = {
  patient_id: "p-abc",
  user_id: null,
  first_name: "Ana",
  last_name: "Lopez",
  birth_date: "1990-05-15",
  gender: "Female",
  contact_email: "ana@example.com",
  description: "Test patient description",
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  deactivated_at: null,
};

// --- Helpers ---

function renderPage() {
  return render(<EditPatientPage />);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRouterPush.mockReset();
});

// --- Tests ---

describe("EditPatientPage", () => {
  it("shows loading state while fetching initial data", () => {
    // Never resolves during this test so loading stays visible
    vi.mocked(patientsApi.getById).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText(/loading patient data/i)).toBeInTheDocument();
  });

  it("pre-populates the form with existing patient data", async () => {
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatient);

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument(),
    );

    const firstNameInput = screen.getByPlaceholderText("First name") as HTMLInputElement;
    const lastNameInput = screen.getByPlaceholderText("Last name") as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText("patient@example.com") as HTMLInputElement;

    expect(firstNameInput.value).toBe("Ana");
    expect(lastNameInput.value).toBe("Lopez");
    expect(emailInput.value).toBe("ana@example.com");
    expect(patientsApi.getById).toHaveBeenCalledWith("p-abc");
  });

  it("calls patch and redirects to patient detail on successful submit", async () => {
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.patch).mockResolvedValue({
      ...mockPatient,
      first_name: "Ana",
      last_name: "Lopez",
    });

    renderPage();

    // Wait for form to be ready
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(patientsApi.patch).toHaveBeenCalledWith(
        "p-abc",
        expect.objectContaining({ first_name: "Ana", last_name: "Lopez" }),
      );
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/patients/p-abc");
    });
  });

  it("shows session-invalid message on 401 error while loading", async () => {
    vi.mocked(patientsApi.getById).mockRejectedValue(
      new ApiError(401, "UNAUTHORIZED", "Not authenticated"),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/session not valid/i)).toBeInTheDocument(),
    );

    expect(screen.getByText(/your session has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toBeInTheDocument();
  });

  it("shows patient not found message on 404 error while loading", async () => {
    vi.mocked(patientsApi.getById).mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Patient not found"),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/patient not found/i)).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: /back to patients/i })).toBeInTheDocument();
  });

  it("shows access denied message on 403 error while loading", async () => {
    vi.mocked(patientsApi.getById).mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "Access denied"),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/access denied/i)).toBeInTheDocument(),
    );

    expect(
      screen.getByText(/does not have permission to edit/i),
    ).toBeInTheDocument();
  });

  it("shows error banner on generic submit failure without changing page status", async () => {
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.patch).mockRejectedValue(
      new ApiError(500, "SERVER_ERROR", "Internal server error"),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument(),
    );

    // Form remains visible after error
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
