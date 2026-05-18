import { AUTH_LOGIN_HREF, AUTH_REGISTER_HREF } from "@/features/auth/auth-routes";

export default function RegisterPage() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_30%),linear-gradient(135deg,#052e16,#14532d_45%,#0f172a)] px-4 py-16 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">Create Access</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Register through Auth0, then complete your VRAINHAX profile in one guided flow.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-200 md:text-lg">
              Account creation happens in Auth0 Universal Login. After signup, the app will ask only for the internal
              profile data it still needs, such as username and role.
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950/70 p-6 shadow-lg ring-1 ring-white/10">
            <h2 className="text-2xl font-semibold">Start your signup</h2>
            <p className="mt-3 text-sm text-slate-300">
              This route opens Auth0 directly in signup mode and returns you to the app when identity creation is complete.
            </p>
            <div className="mt-8 space-y-3">
              <a
                href={AUTH_REGISTER_HREF}
                className="block rounded-full bg-emerald-300 px-5 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200"
              >
                Create account with Auth0
              </a>
              <a
                href={AUTH_LOGIN_HREF}
                className="block rounded-full border border-white/20 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Already registered? Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
