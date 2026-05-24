'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { menu, type MenuItem } from '@/data/adminData';
import { operationModules } from '@/lib/nanofix/operationsConfig';
import { TopSearch } from './TopSearch';

const serviceOperationsMenu: MenuItem = {
  order: '2',
  href: '/service-operations',
  title: 'Service & Order Operations',
  zh: '业务订单处理',
  badge: operationModules.length,
  children: operationModules.map((module) => ({ href: module.route, title: module.title, zh: module.zh }))
};

const adminMenu = menu.map((item) => (item.href.split('#')[0] === '/service-operations' ? serviceOperationsMenu : item));

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminMenu.map((item) => [item.href, true]))
  );

  return (
    <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
      {adminMenu.map((item) => {
        const routeHref = item.href.split('#')[0] || '/dashboard';
        const active = pathname === routeHref || pathname.startsWith(`${routeHref}/`);
        const isOpen = openSections[item.href] ?? true;
        return (
          <section
            key={item.href}
            className={clsx(
              'overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition',
              active ? 'ring-1 ring-blue-300/40' : 'hover:bg-white/[0.055]'
            )}
          >
            <div className={clsx('flex items-stretch gap-2 p-2 transition', active ? 'bg-activeBlue/95 text-white shadow-lg shadow-blue-950/20' : 'text-slate-200')}>
              <Link href={item.href} onClick={onNavigate} className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[13px] font-black">{item.order}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-extrabold leading-5 tracking-[-0.01em]">{item.title}</span>
                  <span className="block text-[13px] font-semibold leading-5 text-slate-300 group-hover:text-slate-100">{item.zh}</span>
                </span>
                <span className={clsx('mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-black', active ? 'bg-white/20' : 'bg-slate-700')}>{item.badge}</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpenSections((current) => ({ ...current, [item.href]: !isOpen }))}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.title}`}
                className="my-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[13px] font-black text-white transition hover:bg-white/20"
                title={isOpen ? 'Collapse / 收起' : 'Expand / 展开'}
              >
                <span aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
              </button>
            </div>
            {isOpen && item.children.length > 0 ? (
              <div className="grid gap-1 px-3 pb-3 pt-2">
                {item.children.map((child) => {
                  const childRoute = child.href.split('#')[0] || child.href;
                  const childActive = pathname === childRoute;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={clsx(
                        'group rounded-xl py-2 pl-12 pr-3 text-[14px] font-bold leading-5 transition hover:bg-white/10 hover:text-white',
                        childActive ? 'bg-white/12 text-white ring-1 ring-white/10' : 'text-blue-100'
                      )}
                    >
                      <span className="block">{child.title}</span>
                      <span className="block text-[12px] font-semibold text-slate-400 group-hover:text-slate-200">{child.zh}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}

function BrandBlock() {
  return (
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/25">
        <img src="/nanofix-logo.png" alt="NANOFIX logo PNG" className="h-full w-full object-contain" />
      </div>
      <div>
        <div className="text-xl font-black tracking-wide">NANOFIX</div>
        <div className="text-[13px] text-slate-300">V28 / 总后台</div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-adminBg text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 flex-col bg-sidebar text-white shadow-2xl lg:flex">
        <BrandBlock />
        <SidebarNav />
        <div className="border-t border-white/10 p-4 text-xs text-slate-300">QR display is backend-only. Public website QR sections are disabled.</div>
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-white shadow-lg lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
            <img src="/nanofix-logo.png" alt="NANOFIX logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-base font-black">NANOFIX V28</div>
            <div className="text-xs font-semibold text-slate-300">Admin Menu / 后台菜单</div>
          </div>
        </div>
        <button type="button" onClick={() => setMobileMenuOpen((value) => !value)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black">
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[64px] z-40 max-h-[calc(100vh-64px)] overflow-y-auto bg-sidebar text-white shadow-2xl lg:hidden">
          <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      ) : null}

      <div className="lg:pl-80">
        <TopSearch />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
