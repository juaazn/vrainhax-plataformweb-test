import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken } from "@auth0/nextjs-auth0/client";
import { request } from "@/features/api/api-client";

vi.mock("@auth0/nextjs-auth0/client", () => ({
  getAccessToken: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    apiBaseUrl: "http://localhost:5000",
    wsUrl: "ws://localhost:5000/ws/clients",
    appEnv: "development",
    auth0Audience: "https://api.auth-vrainhax.com",
  },
}));

const getAccessTokenMock = vi.mocked(getAccessToken);

describe("API Client with Bearer Token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects Bearer token in Authorization header", async () => {
    getAccessTokenMock.mockResolvedValueOnce("token-123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });
    vi.stubGlobal("fetch", fetchMock);

    await request<{ ok: boolean }>("/devices");

    expect(getAccessTokenMock).toHaveBeenCalledWith({
      audience: "https://api.auth-vrainhax.com",
      route: "/api/auth/token",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:5000/devices", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
      },
    });
  });

  it("handles missing token gracefully", async () => {
    getAccessTokenMock.mockRejectedValueOnce(new Error("missing"));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });
    vi.stubGlobal("fetch", fetchMock);

    await request<{ ok: boolean }>("/status");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:5000/status", {
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  it("merges custom headers with the token header", async () => {
    getAccessTokenMock.mockResolvedValueOnce("token-123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });
    vi.stubGlobal("fetch", fetchMock);

    await request("/devices", {
      method: "POST",
      headers: {
        "X-Correlation-Id": "abc-123",
      },
      body: JSON.stringify({}),
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:5000/devices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
        "X-Correlation-Id": "abc-123",
      },
      body: "{}",
    });
  });
});
