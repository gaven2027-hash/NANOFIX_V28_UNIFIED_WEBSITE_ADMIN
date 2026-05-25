import { RegisterForm } from './RegisterForm';

type RegisterContext = 'admin' | 'customer' | 'engineer';

export function RegisterShell({ forcedContext }: { forcedContext?: RegisterContext }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <img
        src="/assets/images/team_on_site_premium.webp"
        alt="NANOFIX homepage hero background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-950/25 to-blue-950/40" />
      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl shadow-slate-950/30 ring-1 ring-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white p-1.5 shadow-soft ring-1 ring-slate-200">
          <img src="/nanofix-logo.svg" alt="NANOFIX logo" className="block h-auto max-h-full w-auto max-w-full object-contain" />
        </div>
        <RegisterForm forcedContext={forcedContext} />
      </section>
    </main>
  );
}
