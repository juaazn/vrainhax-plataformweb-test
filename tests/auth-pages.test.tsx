import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

describe("Auth public pages", () => {
  it("/login contains the Auth0 login CTA and a link to /register", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: /login with auth0/i })).toHaveAttribute(
      "href",
      "/api/auth/login?returnTo=/",
    );
    expect(screen.getByRole("link", { name: /need an account\? register/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("/register contains the signup CTA with screen_hint=signup", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("link", { name: /create account with auth0/i })).toHaveAttribute(
      "href",
      "/api/auth/login?screen_hint=signup&returnTo=/",
    );
  });
});
