import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockUser = vi.fn(() => ({ user: null as { role: string } | null }));
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => mockUser(),
}));

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { Sidebar } from "@/components/layout/sidebar";

describe("Sidebar — role-based navigation", () => {
  beforeEach(() => { mockPathname.mockReturnValue("/"); });

  it("shows only Inicio and Sesiones for patient role", () => {
    mockUser.mockReturnValue({ user: { role: "patient" } });
    render(<Sidebar />);
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Sesiones")).toBeInTheDocument();
    expect(screen.queryByText("Pacientes")).not.toBeInTheDocument();
    expect(screen.queryByText("Nueva sesión")).not.toBeInTheDocument();
    expect(screen.queryByText("Dispositivos")).not.toBeInTheDocument();
  });

  it("shows all links for admin role", () => {
    mockUser.mockReturnValue({ user: { role: "admin" } });
    render(<Sidebar />);
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Pacientes")).toBeInTheDocument();
    expect(screen.getByText("Nueva sesión")).toBeInTheDocument();
    expect(screen.getByText("Sesiones")).toBeInTheDocument();
    expect(screen.getByText("Dispositivos")).toBeInTheDocument();
  });

  it("shows all links for therapist role", () => {
    mockUser.mockReturnValue({ user: { role: "therapist" } });
    render(<Sidebar />);
    expect(screen.getByText("Pacientes")).toBeInTheDocument();
    expect(screen.getByText("Dispositivos")).toBeInTheDocument();
  });

  it("defaults to patient visibility when user is null", () => {
    mockUser.mockReturnValue({ user: null });
    render(<Sidebar />);
    expect(screen.queryByText("Pacientes")).not.toBeInTheDocument();
    expect(screen.queryByText("Dispositivos")).not.toBeInTheDocument();
  });

  it("does not render debug/internal links", () => {
    mockUser.mockReturnValue({ user: { role: "admin" } });
    render(<Sidebar />);
    expect(screen.queryByText(/status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/commands/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/metrics/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sandbox/i)).not.toBeInTheDocument();
  });

  it("marks Inicio as active when pathname is /", () => {
    mockUser.mockReturnValue({ user: { role: "admin" } });
    mockPathname.mockReturnValue("/");
    render(<Sidebar />);
    const inicioLink = screen.getByText("Inicio").closest("a");
    expect(inicioLink?.className).toContain("bg-slate-900");
  });

  it("marks Pacientes as active on nested patient route /patients/123", () => {
    mockUser.mockReturnValue({ user: { role: "admin" } });
    mockPathname.mockReturnValue("/patients/abc-123");
    render(<Sidebar />);
    const pacientesLink = screen.getByText("Pacientes").closest("a");
    expect(pacientesLink?.className).toContain("bg-slate-900");
  });

  it("marks only Nueva sesión as active on /sessions/new (not Sesiones)", () => {
    mockUser.mockReturnValue({ user: { role: "admin" } });
    mockPathname.mockReturnValue("/sessions/new");
    render(<Sidebar />);
    const nuevaSesionLink = screen.getByText("Nueva sesión").closest("a");
    expect(nuevaSesionLink?.className).toContain("bg-slate-900");
    const sesionesLink = screen.getByText("Sesiones").closest("a");
    expect(sesionesLink?.className).not.toContain("bg-slate-900");
  });

  it("shows VRAINHAX brand name", () => {
    mockUser.mockReturnValue({ user: { role: "patient" } });
    render(<Sidebar />);
    expect(screen.getByText("VRAINHAX")).toBeInTheDocument();
  });
});
