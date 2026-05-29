import Link from 'next/link';
import { ReactNode } from 'react';

const navItems = [
  { href: '/customer-portal', label: 'Dashboard', zh: '首页' },
  { href: '/customer-portal/records', label: 'Records', zh: '记录' },
  { href: '/customer-portal/uploads', label: 'Uploads', zh: '文件' },
  { href: '/customer-portal/records#warranties', label: 'Warranties', zh: '保修' },
  { href: '/customer-portal/records#invoices', label: 'Invoices', zh: '发票' }
];

export function CustomerPortalShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/customer-portal" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-activeBlue text-lg font-black text-white shadow-soft">N</span>
            <span>
              <span className="block text-sm font-black tracking-[0.16em] text-slate-950">NANOFIX</span>
              <span className="block text-xs font-bold text-slate-500">Customer Portal / 客户门户</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-activeBlue hover:ring-blue-200">
                {item.label} <span className="font-bold text-slate-400">/ {item.zh}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs font-semibold text-slate-500">
        Customer Portal is separated from the Internal Admin App. / 客户门户与内部管理后台分离。
      </footer>
    </main>
  );
}
