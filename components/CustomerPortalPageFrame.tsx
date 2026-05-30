import { ReactNode } from 'react';

type CustomerPortalPageFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  children: ReactNode;
};

export function CustomerPortalPageFrame({ eyebrow, title, description, primaryLabel = 'Action Centre / 操作中心', secondaryLabel = 'Customer View / 客户视图', children }: CustomerPortalPageFrameProps) {
  return (
    <section className="customer-portal-page-frame grid gap-6">
      <header className="customer-portal-page-hero overflow-hidden rounded-3xl p-6 text-white shadow-soft ring-1 ring-orange-300/25 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">{eyebrow}</div>
            <h1 className="mt-3 text-2xl font-black tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-orange-50/90 md:text-base">{description}</p>
          </div>
          <div className="grid gap-2 text-right text-xs font-black uppercase tracking-[0.12em] text-orange-100">
            <span className="rounded-full bg-orange-500/20 px-4 py-2 ring-1 ring-orange-300/30">{primaryLabel}</span>
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">{secondaryLabel}</span>
          </div>
        </div>
      </header>
      <div className="customer-portal-page-content grid gap-6">{children}</div>
    </section>
  );
}
