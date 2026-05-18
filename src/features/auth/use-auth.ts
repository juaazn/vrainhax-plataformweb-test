import { useAuthContext } from "./auth-provider";

export function useAuth() {
  const { user, status, isLoading, error, refreshAuth, logout } = useAuthContext();
  return { user, status, isLoading, error, refreshAuth, logout };
}
