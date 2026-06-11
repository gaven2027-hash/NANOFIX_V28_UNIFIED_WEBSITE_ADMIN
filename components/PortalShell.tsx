'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { customerPortalNavigation, type CustomerPortalNavItem } from '@/data/v28.7-customer-portal-navigation';
import { CustomerReviewLinkButton } from './CustomerReviewLinkButton';

type PortalType = 'customer' | 'engineer';
type BasicPortalLink = { href: string; title: string; zh: string; shortTitle?: string; shortZh?: string; description: string; descriptionZh: string };
type PortalLink = CustomerPortalNavItem | BasicPortalLink;

const engineerPortalNavigation: BasicPortalLink[] = [
  { href: '/portal/engineer#assigned-jobs', title: 'Assigned Jobs', zh: '已分配工单', shortTitle: 'Jobs', shortZh: '工单', description: 'Assigned inspection and repair jobs for the logged-in engineer.', descriptionZh: '当前工程师已分配的查验与维修工单。' },
  { href: '/portal/engineer#inspection-checklist', title: 'Inspection Checklist', zh: '查验清单', shortTitle: 'Check', shortZh: '查验', description: 'On-site inspection checklist, issue photos and technician notes.', descriptionZh: '现场查验清单、问题照片与工程师记录。' },
  { href: '/portal/engineer#upload-photos', title: 'Upload Photos', zh: '上传照片', shortTitle: 'Photos', shortZh: '照片', description: 'Upload before, during and after repair photos for job records.', descriptionZh: '上传施工前、施工中、施工后的现场照片。' },
  { href: '/portal/engineer#job-notes', title: 'Job Notes', zh: '工单记录', shortTitle: 'Notes', shortZh: '记录', description: 'Engineer job notes, material usage and daily progress updates.', descriptionZh: '工程师工单记录、材料使用和每日进度。' },
  { href: '/portal/engineer#completion-report', title: 'Completion Report', zh: '完工报告', shortTitle: 'Done', shortZh: '完工', description: 'Completion checklist, final photos and handover notes.', descriptionZh: '完工检查、最终照片与交付说明。' }
];

function anchorFromHref(href: string) {
  return href.includes('#') ? href.split('#')[1] : href.replace(/^\//, '').replace(/\//g, '-');
}

function legacyAnchorList(item: { href: string; legacyFrom?: string[] }) {
  return Array.from(new Set([anchorFromHref(item.href), ...(item.legacyFrom || [])]));
}

function navForType(type: PortalType): PortalLink[] {
  return type === 'customer' ? customerPortalNavigation : engineerPortalNavigation;
}

function headingForType(type: PortalType) {
  return type === 'customer' ? 'Customer Portal / 客户会员中心' : 'Engineer Portal / 工程师门户';
}

function subheadingForType(type: PortalType) {
  return type === 'customer'
    ? 'Customers only see their own repair, quote, payment, warranty, document and support records. / 客户只查看自己的维修、报价、付款、保修、文件和客服记录。'
    : 'Engineers only see their assigned jobs, checklists, uploads, notes and completion records. / 工程师只查看自己分配的工单、查验清单、上传、记录和完工资料。';
}

function portalLabel(type: PortalType) {
  return type === 'customer' ? 'Client Portal' : 'Engineer Portal';
}

function mobileTitle(link: PortalLink) {
  return link.shortTitle ?? link.title;
}

function mobileZh(link: PortalLink) {
  return link.shortZh ?? link.zh;
}

export function PortalShell({ type, children }: { type: PortalType; children: React.ReactNode }) {
  const pathname = usePathname();
  const links = navForType(type);
  const heading = headingForType(type);
  const subheading = subheadingForType(type);
  const portalOrder = type === 'customer' ? 'P1' : 'P2';

  return (
    <div className="min-h-screen bg-adminBg pb-24 text-slate-900 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-sidebar text-white shadow-2xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/25">
            <img src="/nanofix-logo.png" alt="NANOFIX logo PNG" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-black tracking-wide">NANOFIX</div>
            <div className="text-[13px] text-slate-300">{portalLabel(type)}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
          {links.map((link) => {
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
          {type === 'customer'
            ? 'Customer portal is simplified to five self-service menus. / 客户后台已精简为 5 个自助菜单。'
            : 'Engineer portal is isolated from Admin menus. / 工程师门户与总后台菜单隔离。'}
        </div>
      </aside>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-900"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-activeBlue">
              {type === 'customer' ? 'Customer-only RLS APIs / 客户独立权限接口' : 'Engineer-only RLS APIs / 工程师独立权限接口'}
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div id={type === 'customer' ? 'dashboard' : 'assigned-jobs'} className="mb-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">{type === 'customer' ? 'Customer self-service workspace' : 'Engineer field-service workspace'}</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{subheading}</p>
            {type === 'customer' ? <CustomerReviewLinkButton /> : null}
          </div>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-2xl backdrop-blur lg:hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-2xl px-2 py-2 text-center text-[11px] font-black text-slate-700 hover:bg-blue-50 hover:text-activeBlue">
            <span className="block">{mobileTitle(link)}</span>
            <span className="block text-[10px] font-semibold text-slate-500">{mobileZh(link)}</span>
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

export function EngineerPortalAnchors() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {engineerPortalNavigation.map((item) => {
        const id = anchorFromHref(item.href);
        return (
          <section key={item.href} id={id} className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">{item.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{item.zh}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description} / {item.descriptionZh}</p>
          </section>
        );
      })}
    </div>
  );
}
