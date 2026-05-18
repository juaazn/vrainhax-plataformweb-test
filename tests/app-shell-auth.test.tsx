import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/use-auth";

const replaceMock = vi.fn();
let pathnameMock = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/realtime/realtime-provider", () => ({
  RealtimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <aside>Sidebar</aside>,
}));

vi.mock("@/components/layout/topbar", () => ({
  Topbar: () => <header>Topbar</header>,
}));

const useAuthMock = vi.mocked(useAuth);

describe("AppShell auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects private routes to /login when unauthenticated", async () => {
    pathnameMock = "/devices";
    useAuthMock.mockReturnValue({
      user: null,
      status: "unauthenticated",
      isLoading: false,
      error: undefined,
      refreshAuth: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AppShell>
        <div>Private content</div>
      </AppShell>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects users with incomplete profile to /complete-profile", async () => {
    pathnameMock = "/devices";
    useAuthMock.mockReturnValue({
      user: null,
      status: "profile_incomplete",
      isLoading: false,
      error: undefined,
      refreshAuth: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AppShell>
        <div>Private content</div>
      </AppShell>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/complete-profile"));
  });

  it("renders public auth pages without redirect when unauthenticated", () => {
    pathnameMock = "/login";
    useAuthMock.mockReturnValue({
      user: null,
      status: "unauthenticated",
      isLoading: false,
      error: undefined,
      refreshAuth: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AppShell>
        <div>Login content</div>
      </AppShell>,
    );

    expect(screen.getByText("Login content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
