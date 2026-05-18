import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompleteProfilePage from "@/app/complete-profile/page";
import { syncUser } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/use-auth";

const replaceMock = vi.fn();
const refreshAuthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/auth/auth-api", () => ({
  syncUser: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const syncUserMock = vi.mocked(syncUser);

describe("Complete Profile Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: null,
      status: "profile_incomplete",
      isLoading: false,
      error: undefined,
      refreshAuth: refreshAuthMock,
      logout: vi.fn(),
    });
  });

  it("submits the form and redirects home on success", async () => {
    syncUserMock.mockResolvedValueOnce({
      data: {
        userId: "8f7773fe-cf0d-4f2d-a3c3-f7790efe1d66",
        username: "ana",
        email: "ana@example.com",
        role: "therapist",
        active: true,
      },
    });
    refreshAuthMock.mockResolvedValueOnce(undefined);

    render(<CompleteProfilePage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "ana" } });
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: "550e8400-e29b-41d4-a716-446655440002" },
    });
    fireEvent.click(screen.getByRole("button", { name: /complete profile/i }));

    await waitFor(() =>
      expect(syncUserMock).toHaveBeenCalledWith("ana", "550e8400-e29b-41d4-a716-446655440002"),
    );
    await waitFor(() => expect(refreshAuthMock).toHaveBeenCalled());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("shows backend sync errors", async () => {
    syncUserMock.mockRejectedValueOnce({ message: "Username already exists" });

    render(<CompleteProfilePage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "ana" } });
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: "550e8400-e29b-41d4-a716-446655440002" },
    });
    fireEvent.click(screen.getByRole("button", { name: /complete profile/i }));

    expect(await screen.findByText("Username already exists")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
