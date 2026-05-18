export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:5000/ws/clients",
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  auth0Audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
};
