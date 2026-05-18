import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/features/auth/auth-provider";

export const metadata: Metadata = {
  title: "VRAINHAX Web Test",
  description: "Web test app for backend and Unity realtime integration",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppQueryProvider>
            <AppShell>{children}</AppShell>
          </AppQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
