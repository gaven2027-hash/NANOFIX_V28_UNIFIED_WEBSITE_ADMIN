'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { menu, type MenuItem } from '@/data/adminData';
import { dashboardSections } from '@/lib/nanofix/dashboardConfig';
import { operationModules } from '@/lib/nanofix/operationsConfig';
import { websiteSections } from '@/lib/nanofix/websiteManagementConfig';
import { socialMediaSections } from '@/lib/nanofix/socialMediaConfig';
import { aiIntelligenceSections } from '@/lib/nanofix/aiIntelligenceConfig';
import { customerCenterSections } from '@/lib/nanofix/customerCenterConfig';
import { systemSettingsSections } from '@/lib/nanofix/systemSettingsConfig';
import { customerPortalSections } from '@/lib/nanofix/customerPortalConfig';
import { engineerPortalSections } from '@/lib/nanofix/engineerPortalConfig';
import { TopSearch } from './TopSearch';

const globalSearchMenu: MenuItem = { order: 'Top', href: '/dashboard/global-search', title: 'Top Fixed Global Search', zh: '顶部固定全局搜索', badge: 'All', children: [] };
const dashboardMenu: MenuItem = { order: '1', href: '/dashboard', title: 'Dashboard, Analytics & Alerts', zh: '数据分析、预警、待处理事项', badge: dashboardSections.length, children: dashboardSections.filter((section) => section.key !== 'global-search').map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const serviceOperationsMenu: MenuItem = { order: '2', href: '/service-operations', title: 'Service & Order Operations', zh: '业务订单处理', badge: operationModules.length, children: operationModules.map((module) => ({ href: module.route, title: module.title, zh: module.zh })) };
const websiteManagementMenu: MenuItem = { order: '3', href: '/website-management', title: 'Website Management', zh: '网站后台管理', badge: websiteSections.length, children: websiteSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const socialMediaMenu: MenuItem = { order: '4', href: '/social-media', title: 'Social Media Management', zh: '社媒管理', badge: socialMediaSections.length, children: socialMediaSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const aiIntelligenceMenu: MenuItem = { order: '5', href: '/ai-intelligence', title: 'AI Intelligence Center', zh: 'AI 智能中心', badge: aiIntelligenceSections.length, children: aiIntelligenceSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const customerCenterMenu: MenuItem = { order: '6', href: '/customer-center', title: 'Customer Center', zh: '客户相关', badge: customerCenterSections.length, children: customerCenterSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const systemSettingsMenu: MenuItem = { order: '7', href: '/system-settings', title: 'Website & System Settings', zh: '网站与系统设置', badge: systemSettingsSections.length, children: systemSettingsSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const customerPortalMenu: MenuItem = { order: 'P1', href: '/customer-portal', title: 'Customer Portal', zh: '客户会员中心入口', badge: customerPortalSections.length, children: customerPortalSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };
const engineerPortalMenu: MenuItem = { order: 'P2', href: '/engineer-portal', title: 'Engineer Portal', zh: '工程师端入口', badge: engineerPortalSections.length, children: engineerPortalSections.map((section) => ({ href: section.href, title: section.title, zh: section.zh })) };

const adminMenu = menu.map((item) => {
  const route = item.href.split('#')[0];
  if (item.href === '/dashboard#global-search') return globalSearchMenu;
  if (route === '/dashboard') return dashboardMenu;
  if (route === '/service-operations') return serviceOperationsMenu;
  if (route === '/website-management') return websiteManagementMenu;
  if (route === '/social-media') return socialMediaMenu;
  if (route === '/ai-intelligence') return aiIntelligenceMenu;
  if (route === '/customer-center') return customerCenterMenu;
  if (route === '/system-settings') return systemSettingsMenu;
  if (route === '/customer-portal') return customerPortalMenu;
  if (route === '/engineer-portal') return engineerPortalMenu;
  return item;
});

const SIDEBAR_SCROLL_KEY = 'nanofix_admin_sidebar_scroll_top_v4';

function LogoMark({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const boxClass = size === 'sm' ? 'h-12 w-12 rounded-xl' : 'h-16 w-16 rounded-2xl';
  return (
    <div className={clsx('flex shrink-0 items-center justify-center bg-white p-1.5 shadow-lg shadow-slate-950/25', boxClass)}>
      <img src="/nanofix-logo.svg" alt="NANOFIX logo" className="block max-h-full max-w-full object-contain" style={{ width: 'auto', height: 'auto', aspectRatio: 'auto' }} />
    </div>
  );
}

function routeIsActive(pathname: string, href: string) {
  const routeHref = href.split('#')[0] || '/dashboard';
  if (routeHref === '/dashboard') return pathname === '/dashboard';
  return pathname === routeHref || pathname.startsWith(`${routeHref}/`);
}

function sectionIsActive(pathname: string, item: MenuItem) {
  return routeIsActive(pathname, item.href) || item.children.some((child) => routeIsActive(pathname, child.href));
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const activeChildRef = useRef<HTMLAnchorElement | null>(null);
  const clickedScrollRef = useRef<number | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => Object.fromEntries(adminMenu.map((item) => [item.href, false])));

  function saveScrollPosition() {
    if (typeof window === 'undefined' || !navRef.current) return;
    const top = navRef.current.scrollTop;
    clickedScrollRef.current = top;
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(top));
  }

  function handleNavigate() {
    saveScrollPosition();
    onNavigate?.();
  }

  useEffect(() => {
    setOpenSections((current) => {
      const next = { ...current };
      for (const item of adminMenu) {
        if (sectionIsActive(pathname, item)) next[item.href] = true;
      }
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = Number(window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || 0);
    window.requestAnimationFrame(() => {
      if (!navRef.current) return;
      if (Number.isFinite(saved) && saved > 0) navRef.current.scrollTop = saved;
      window.requestAnimationFrame(() => activeChildRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    });
  }, [pathname]);

  return (
    <nav ref={navRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5 text-white" onScroll={() => {
      if (!navRef.current || clickedScrollRef.current === navRef.current.scrollTop) return;
      window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navRef.current.scrollTop));
    }}>
      {adminMenu.map((item) => {
        const active = sectionIsActive(pathname, item);
        const isOpen = openSections[item.href] ?? false;
        return (
          <section key={item.href} className={clsx('overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition', active ? 'ring-1 ring-blue-300/50' : 'hover:bg-white/[0.07]')}>
            <div className={clsx('flex items-stretch gap-2 p-2 transition', active ? 'bg-activeBlue text-white shadow-lg shadow-blue-950/20' : 'text-slate-100')}>
              <Link href={item.href} onClick={handleNavigate} className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[13px] font-black text-white">{item.order}</span>
                <span className="min-w-0 flex-1"><span className="block text-[16px] font-extrabold leading-5 tracking-[-0.01em] text-white">{item.title}</span><span className="block text-[13px] font-semibold leading-5 text-slate-200 group-hover:text-white">{item.zh}</span></span>
                <span className={clsx('mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-black text-white', active ? 'bg-white/20' : 'bg-slate-700')}>{item.badge}</span>
              </Link>
              {item.children.length > 0 ? <button type="button" onClick={() => { saveScrollPosition(); setOpenSections((current) => ({ ...current, [item.href]: !isOpen })); }} aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.title}`} className="my-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[13px] font-black text-white transition hover:bg-white/20" title={isOpen ? 'Collapse / 收起' : 'Expand / 展开'}><span aria-hidden="true">{isOpen ? '▴' : '▾'}</span></button> : null}
            </div>
            {isOpen && item.children.length > 0 ? (
              <div className="grid gap-1 px-3 pb-3 pt-2">
                {item.children.map((child) => {
                  const childActive = routeIsActive(pathname, child.href);
                  return <Link ref={childActive ? activeChildRef : undefined} key={child.href} href={child.href} onClick={handleNavigate} className={clsx('group rounded-xl py-2 pl-12 pr-3 text-[14px] font-bold leading-5 transition hover:bg-white/10 hover:text-white', childActive ? 'bg-white/15 text-white ring-1 ring-white/10' : 'text-blue-100')}><span className="block text-current">{child.title}</span><span className={clsx('block text-[12px] font-semibold group-hover:text-slate-100', childActive ? 'text-slate-100' : 'text-slate-300')}>{child.zh}</span></Link>;
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
  return <div className="flex h-24 items-center gap-3 border-b border-white/10 px-6"><LogoMark /><div><div className="text-xl font-black tracking-wide text-white">NANOFIX</div><div className="text-[13px] font-semibold text-slate-300">V28 / 总后台</div></div></div>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-adminBg text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 flex-col bg-sidebar text-white shadow-2xl lg:flex"><BrandBlock /><SidebarNav /><div className="border-t border-white/10 p-4 text-xs font-semibold text-slate-300">QR display is backend-only. Public website QR sections are disabled.</div></aside>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-white shadow-lg lg:hidden"><div className="flex items-center gap-3"><LogoMark size="sm" /><div><div className="text-base font-black text-white">NANOFIX V28</div><div className="text-xs font-semibold text-slate-300">Admin Menu / 后台菜单</div></div></div><button type="button" onClick={() => setMobileMenuOpen((value) => !value)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white">{mobileMenuOpen ? 'Close' : 'Menu'}</button></div>
      {mobileMenuOpen ? <div className="fixed inset-x-0 top-[64px] z-40 max-h-[calc(100vh-64px)] overflow-y-auto bg-sidebar text-white shadow-2xl lg:hidden"><SidebarNav onNavigate={() => setMobileMenuOpen(false)} /></div> : null}
      <div className="lg:pl-80"><TopSearch /><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main></div>
    </div>
  );
}
