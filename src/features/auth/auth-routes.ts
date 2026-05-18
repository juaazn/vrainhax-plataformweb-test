export const AUTH_LOGIN_HREF = "/api/auth/login?returnTo=/";
export const AUTH_REGISTER_HREF = "/api/auth/login?screen_hint=signup&returnTo=/";
export const AUTH_LOGOUT_HREF = "/api/auth/logout";

export const PUBLIC_AUTH_PATHS = ["/login", "/register", "/complete-profile"] as const;

export function isPublicAuthPath(pathname: string | null): boolean {
  return pathname !== null && PUBLIC_AUTH_PATHS.includes(pathname as (typeof PUBLIC_AUTH_PATHS)[number]);
}

