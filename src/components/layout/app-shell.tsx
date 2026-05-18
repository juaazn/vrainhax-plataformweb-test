"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Sidebar } from "@/components/layout/sidebar";
import { RealtimeProvider } from "@/features/realtime/realtime-provider";
import { isPublicAuthPath } from "@/features/auth/auth-routes";
import { useAuth } from "@/features/auth/use-auth";
import { cn } from "@/lib/cn";

function StatusPanel({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, error, refreshAuth } = useAuth();
  const isPublicRoute = isPublicAuthPath(pathname);
  const isCompleteProfileRoute = pathname === "/complete-profile";
  const shouldRedirectToCompleteProfile =
    status === "profile_incomplete" && !isCompleteProfileRoute;
  const shouldRedirectToLogin = status === "unauthenticated" && !isPublicRoute;
  const shouldRedirectToHome =
    status === "authenticated" && isPublicRoute;

  useEffect(() => {
    if (status === "loading" || status === "error") return;

    if (shouldRedirectToLogin) {
      router.replace("/login");
      return;
    }

    if (shouldRedirectToCompleteProfile) {
      router.replace("/complete-profile");
      return;
    }

    if (status === "profile_incomplete" && pathname !== "/complete-profile") {
      router.replace("/complete-profile");
      return;
    }

    if (shouldRedirectToHome) {
      router.replace("/");
    }
  }, [pathname, router, shouldRedirectToCompleteProfile, shouldRedirectToHome, shouldRedirectToLogin, status]);

  if (status === "loading" || shouldRedirectToLogin || shouldRedirectToCompleteProfile || shouldRedirectToHome) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Topbar />
        <StatusPanel
          title="Checking your session"
          message="We are validating your Auth0 session and preparing the right route."
        />
      </div>
    );
  }

  if (status === "error" && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Topbar />
        <StatusPanel
          title="Authentication check failed"
          message={error ?? "The application could not validate your current session."}
          action={
            <button
              type="button"
              onClick={() => void refreshAuth()}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Topbar />
        {children}
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
        <Sidebar />
        <main className="flex-1">
          <Topbar />
          <div className={cn("p-4 md:p-6")}>{children}</div>
        </main>
      </div>
    </RealtimeProvider>
  );
}
