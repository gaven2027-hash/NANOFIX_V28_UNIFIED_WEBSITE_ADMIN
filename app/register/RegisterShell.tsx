import { RegisterForm } from './RegisterForm';

type RegisterContext = 'admin' | 'customer';

const registerPhoneAndLogoCss = `
  .nanofix-register-card div:has(> select[aria-label="Country calling code / 国家区号"]) {
    grid-template-columns: 40% 60% !important;
  }
  .nanofix-register-card select[aria-label="Country calling code / 国家区号"] {
    font-size: 12px !important;
    font-weight: 800 !important;
    padding-left: 10px !important;
    padding-right: 6px !important;
    text-overflow: clip !important;
  }
  .nanofix-register-logo-img {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }
`;

export function RegisterShell({ forcedContext }: { forcedContext?: RegisterContext }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <style dangerouslySetInnerHTML={{ __html: registerPhoneAndLogoCss }} />
      <img src="/assets/images/team_on_site_premium.webp" alt="NANOFIX background" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-950/25 to-blue-950/40" />
      <section className="nanofix-register-card relative z-10 w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl shadow-slate-950/30 ring-1 ring-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white p-1.5 shadow-soft ring-1 ring-slate-200">
          <img src="/icon.png" alt="NANOFIX logo" className="nanofix-register-logo-img" />
        </div>
        <RegisterForm forcedContext={forcedContext} />
      </section>
    </main>
  );
}
