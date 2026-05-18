import { Auth0Client } from "@auth0/nextjs-auth0/server";

const audience = process.env.AUTH0_AUDIENCE ?? process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;

export const auth0 = new Auth0Client({
  ...(process.env.APP_BASE_URL ? { appBaseUrl: process.env.APP_BASE_URL } : {}),
  ...(audience ? { authorizationParameters: { audience } } : {}),
  routes: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    callback: "/api/auth/callback",
    profile: "/api/auth/profile",
    accessToken: "/api/auth/token",
    backChannelLogout: "/api/auth/backchannel-logout",
  },
});
