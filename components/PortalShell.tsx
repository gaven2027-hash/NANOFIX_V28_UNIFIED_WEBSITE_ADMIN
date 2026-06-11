'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { customerPortalNavigation } from '@/data/v28.7-customer-portal-navigation';
import { CustomerReviewLinkButton } from './CustomerReviewLinkButton';

function anchorFromHref(href: string) {
  return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-');
}

function legacyAnchorList(item: { href: string; legacyFrom: string[] }) {
  return Array.from(new Set([anchorFromHref(item.href), ...item.legacyFrom]));
}

export function PortalShell({ type, children }: { type: 'customer'; children: React.ReactNode }) {
  const pathname = usePathname();
  const heading = 'Customer Portal / 客户会员中心';
  const portalOrder = 'P1';
  const subheading = 'Customers only see their own repair, quote, payment, warranty, document and support records. / 客户只查看自己的维修、报价、付款、保修、文件和客服记录。';

  return (
    <div className="min-h-screen bg-adminBg pb-24 text-slate-900 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-sidebar text-white shadow-2xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/25">
            <img src="/nanofix-logo.png" alt="NANOFIX logo PNG" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-black tracking-wide">NANOFIX</div>
            <div className="text-[13px] text-slate-300">Client Portal</div>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
          {customerPortalNavigation.map((link) => {
            const active = pathname === link.href.split('#')[0];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'block rounded-2xl px-4 py-3 text-sm font-extrabold transition',
                  active ? 'bg-activeBlue text-white shadow-lg shadow-blue-950/20' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className="block">{link.title}</span>
                <span className="block text-xs font-semibold text-slate-300">{link.zh}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-slate-300">
          Customer portal is simplified to five self-service menus. / 客户后台已精简为 5 个自助菜单。
        </div>
      </aside>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-900"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-activeBlue">Customer-only RLS APIs / 客户独立权限接口</div>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div id="dashboard" className="mb-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer self-service workspace</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{subheading}</p>
            <CustomerReviewLinkButton />
          </div>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-2xl backdrop-blur lg:hidden">
        {customerPortalNavigation.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-2xl px-2 py-2 text-center text-[11px] font-black text-slate-700 hover:bg-blue-50 hover:text-activeBlue">
            <span className="block">{link.shortTitle}</span>
            <span className="block text-[10px] font-semibold text-slate-500">{link.shortZh}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function CustomerPortalAnchors() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {customerPortalNavigation.map((item) => {
        const id = anchorFromHref(item.href);
        return (
          <section key={item.href} id={id} className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            {legacyAnchorList(item).filter((anchor) => anchor !== id).map((anchor) => (
              <span key={anchor} id={anchor} data-customer-portal-legacy-anchor={id} className="block scroll-mt-32" />
            ))}
            <h2 className="text-lg font-black text-slate-950">{item.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{item.zh}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description} / {item.descriptionZh}</p>
            {item.includesReviewLink ? <CustomerReviewLinkButton /> : null}
          </section>
        );
      })}
    </div>
  );
}
