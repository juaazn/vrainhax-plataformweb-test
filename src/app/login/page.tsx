import { AUTH_LOGIN_HREF } from "@/features/auth/auth-routes";

export default function LoginPage() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.20),_transparent_34%),linear-gradient(135deg,#020617,#0f172a_45%,#1e293b)] px-4 py-16 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200">VRAINHAX</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Sign in to keep the rehab dashboards and realtime tools under one session.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-200 md:text-lg">
              Authentication is handled by Auth0. Once your identity is confirmed, the app checks whether your
              internal profile is ready and routes you to the correct next step.
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950/70 p-6 shadow-lg ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold">Continue with Auth0</h2>
            <p className="mt-3 text-sm text-slate-300">
              Use your existing account to reach the dashboard. New users can create their account from the register page.
            </p>
            <div className="mt-8 space-y-3">
              <a
                href={AUTH_LOGIN_HREF}
                className="block rounded-full bg-sky-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Login with Auth0
              </a>
              <a
                href="/register"
                className="block rounded-full border border-white/20 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Need an account? Register
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
