'use client';

import { useState } from 'react';
import clsx from 'clsx';

export function SectionCard({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className={clsx('rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200', className)}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        className="relative mb-3 grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_8%_40%,rgba(203,213,225,0.18),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(148,163,184,0.14),transparent_28%),linear-gradient(115deg,#475569_0%,#64748B_50%,#475569_100%)] px-3 py-2 text-left text-white shadow-sm ring-1 ring-slate-300/55 transition hover:brightness-105"
      >
        <div className="absolute -right-6 -top-6 h-14 w-20 rotate-12 rounded-[45%] bg-white/15 blur-xl" />
        <div className="relative min-w-0">
          <h3 className="text-[15px] font-black leading-5 text-white">{title}</h3>
          {subtitle ? <p className="mt-0.5 block max-w-full overflow-hidden whitespace-nowrap text-[9.5px] font-semibold leading-3 tracking-[-0.01em] text-[#CBD5E1]">{subtitle}</p> : null}
        </div>
        <span className="relative z-10 rounded-full border border-white/25 bg-white/15 px-2.5 py-1.5 text-[10px] font-black text-white shadow-sm">
          {collapsed ? 'Expand / 展开 ▾' : 'Collapse / 收起 ▴'}
        </span>
      </button>
      {!collapsed ? children : null}
    </section>
  );
}
