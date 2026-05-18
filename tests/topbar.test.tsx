import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/features/auth/use-auth";

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

describe("Topbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Login and Register when unauthenticated", () => {
    useAuthMock.mockReturnValue({
      user: null,
      status: "unauthenticated",
      isLoading: false,
      error: undefined,
      refreshAuth: vi.fn(),
      logout: vi.fn(),
    });

    render(<Topbar />);

    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/api/auth/login?returnTo=/");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/api/auth/login?screen_hint=signup&returnTo=/",
    );
  });

  it("shows authenticated user and Logout button when authenticated", () => {
    const logoutMock = vi.fn();
    useAuthMock.mockReturnValue({
      user: {
        email: "ana@example.com",
        username: "ana",
      },
      status: "authenticated",
      isLoading: false,
      error: undefined,
      refreshAuth: vi.fn(),
      logout: logoutMock,
    });

    render(<Topbar />);

    expect(screen.getByText("ana")).toBeInTheDocument();
    // Logout is now a button (calls backend revoke before redirecting to Auth0)
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });
});
