import { describe, expect, it, vi } from "vitest";
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

describe("api-client", () => {
  it("returns JSON payload on success", async () => {
    getAccessTokenMock.mockRejectedValueOnce(new Error("missing"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"ok":true}' }),
    );

    const result = await request<{ ok: boolean }>("/health");
    expect(result.data.ok).toBe(true);
  });

  it("unwraps payloads wrapped in data", async () => {
    getAccessTokenMock.mockRejectedValueOnce(new Error("missing"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"data":{"userId":"1","email":"ana@example.com"}}',
      }),
    );

    const result = await request<{ userId: string; email: string }>("/api/v1/auth/me");
    expect(result.data.email).toBe("ana@example.com");
  });

  it("throws http error payload", async () => {
    getAccessTokenMock.mockRejectedValueOnce(new Error("missing"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Server Error", text: async () => '{"error":"x","message":"fail","statusCode":500}' }),
    );

    await expect(request("/health")).rejects.toMatchObject({ statusCode: 500 });
  });
});
