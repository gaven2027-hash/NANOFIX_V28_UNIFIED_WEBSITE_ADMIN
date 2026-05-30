import Link from 'next/link';
import { ReactNode } from 'react';
import styles from './CustomerPortalMobileHardening.module.css';

const navItems = [
  { href: '/customer-portal', label: 'Dashboard', zh: '首页' },
  { href: '/customer-portal/submit-request', label: 'Submit Request', zh: '提交维修' },
  { href: '/customer-portal/records', label: 'Records', zh: '记录' },
  { href: '/customer-portal/uploads', label: 'Uploads', zh: '文件' },
  { href: '/customer-portal/financial', label: 'Finance', zh: '财务' },
  { href: '/customer-portal/warranties', label: 'Warranties', zh: '保修' },
  { href: '/customer-portal/financial#invoices', label: 'Invoices', zh: '发票' }
];

export function CustomerPortalShell({ children }: { children: ReactNode }) {
  return (
    <main className={`nanofix-customer-portal min-h-screen ${styles.mobileHardening}`}>
      <header className="customer-portal-header sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/customer-portal" className="flex items-center gap-3">
            <span className="customer-portal-logo grid h-11 w-11 place-items-center rounded-2xl text-lg font-black text-white shadow-soft">N</span>
            <span>
              <span className="block text-sm font-black tracking-[0.16em] text-white">NANOFIX</span>
              <span className="block text-xs font-bold text-orange-100">Customer Portal / 客户门户</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-orange-50 ring-1 ring-orange-300/25 transition hover:bg-orange-500/20 hover:text-white hover:ring-orange-300/60">
                {item.label} <span className="font-bold text-orange-200/75">/ {item.zh}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="customer-portal-priority-strip mb-6 rounded-3xl px-5 py-4 text-sm font-black shadow-soft">
          Priority service records, quotations, invoices and warranties are shown here for quick action. / 这里集中显示服务记录、报价、发票和保修，方便快速处理。
        </div>
        <div className="customer-portal-shell-card p-3 md:p-5">{children}</div>
      </div>
      <footer className="customer-portal-footer mx-auto max-w-6xl px-4 pb-8 text-xs font-semibold">
        Customer Portal is separated from the Internal Admin App. / 客户门户与内部管理后台分离。
      </footer>
    </main>
  );
}
