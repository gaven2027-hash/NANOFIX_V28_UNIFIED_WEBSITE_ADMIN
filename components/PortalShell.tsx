'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const customerLinks = [
  { href: '/customer-portal#my-repair-requests', title: 'My Repair Requests', zh: '我的报修' },
  { href: '/customer-portal#my-quotations', title: 'My Quotations', zh: '我的报价' },
  { href: '/customer-portal#my-invoices', title: 'My Invoices & Payments', zh: '我的发票与付款' },
  { href: '/customer-portal#my-warranties', title: 'My Warranty', zh: '我的保修' },
  { href: '/customer-portal#my-profile', title: 'My Profile', zh: '我的资料' }
];

const engineerLinks = [
  { href: '/engineer-portal#assigned-jobs', title: 'Assigned Jobs', zh: '已分配工单' },
  { href: '/engineer-portal#inspection-checklist', title: 'Inspection Checklist', zh: '查验清单' },
  { href: '/engineer-portal#upload-photos', title: 'Upload Photos', zh: '上传照片' },
  { href: '/engineer-portal#job-notes', title: 'Job Notes', zh: '工单记录' },
  { href: '/engineer-portal#completion-report', title: 'Completion Report', zh: '完工报告' }
];

export function PortalShell({ type, children }: { type: 'customer' | 'engineer'; children: React.ReactNode }) {
  const pathname = usePathname();
  const links = type === 'customer' ? customerLinks : engineerLinks;
  const heading = type === 'customer' ? 'Customer Portal / 客户会员中心' : 'Engineer Portal / 工程师工作台';
  const portalOrder = type === 'customer' ? 'P1' : 'P2';
  const subheading = type === 'customer'
    ? 'Customers only see their own linked repair, quote, invoice, payment and warranty records.'
    : 'Engineers only see assigned jobs, checklists, photos and completion actions.';

  return (
    <div className="min-h-screen bg-adminBg text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-sidebar text-white shadow-2xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/25">
            <img src="/nanofix-logo.png" alt="NANOFIX logo PNG" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-black tracking-wide">NANOFIX</div>
            <div className="text-[13px] text-slate-300">{type === 'customer' ? 'Client Portal' : 'Engineer Portal'}</div>
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
          Admin menus are hidden in portal mode. / 门户模式不显示总后台菜单。
        </div>
      </aside>
      <div className="lg:pl-72">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-900"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-activeBlue">Portal-only search APIs / 门户独立搜索接口</div>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Role-isolated workspace</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{subheading}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function CustomerPortalAnchors() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {customerLinks.map((link) => (
        <section key={link.href} id={link.href.split('#')[1]} className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <h2 className="text-lg font-black text-slate-950">{link.title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{link.zh}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">This area must be loaded through RLS-filtered customer records only. / 此区域仅显示当前客户自己的绑定记录。</p>
        </section>
      ))}
    </div>
  );
}

export function EngineerPortalAnchors() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {engineerLinks.map((link) => (
        <section key={link.href} id={link.href.split('#')[1]} className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <h2 className="text-lg font-black text-slate-950">{link.title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{link.zh}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">This area must be filtered by assigned engineer_id and job permissions. / 此区域按工程师分配工单权限过滤。</p>
        </section>
      ))}
    </div>
  );
}
