'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const customerLinks = [
  { href: '/customer-portal#customer-register', title: 'Customer Register', zh: '客户注册' },
  { href: '/customer-portal#customer-login', title: 'Customer Login', zh: '客户登录' },
  { href: '/customer-portal#submit-request', title: 'Submit Request', zh: '客户提交请求' },
  { href: '/customer-portal#new-repair-request', title: 'New Repair Request', zh: '新增维修' },
  { href: '/customer-portal#warranty-claim', title: 'Warranty Claim', zh: '保修范围申请' },
  { href: '/customer-portal#my-repair-requests', title: 'My Repair Requests', zh: '我的报修记录' },
  { href: '/customer-portal#my-quotations', title: 'My Quotations', zh: '我的报价' },
  { href: '/customer-portal#my-invoices', title: 'My Invoices', zh: '我的发票' },
  { href: '/customer-portal#my-payments-receipts', title: 'My Payments & Receipts', zh: '我的付款与收据' },
  { href: '/customer-portal#my-warranties', title: 'My Warranties', zh: '我的保修' },
  { href: '/customer-portal#submit-review', title: 'Submit Review', zh: '客户发表评论' },
  { href: '/customer-portal#my-reviews', title: 'My Reviews', zh: '我的评价' },
  { href: '/customer-portal#review-privacy-settings', title: 'Review Privacy Settings', zh: '评价公开信息设置' }
];

export function PortalShell({ type, children }: { type: 'customer'; children: React.ReactNode }) {
  const pathname = usePathname();
  const heading = 'Customer Portal / 客户会员中心';
  const portalOrder = 'P1';
  const subheading = 'Customers only see their own linked repair, quote, invoice, payment, warranty and review records. / 客户只查看自己绑定的报修、报价、发票、付款、保修和评价记录。';

  return (
    <div className="min-h-screen bg-adminBg text-slate-900">
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
          {customerLinks.map((link) => {
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
          Admin menus are hidden in portal mode. Engineer uses Internal Admin App role login. / 门户模式不显示总后台菜单；工程师使用内部后台角色登录。
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
          <div className="mb-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Customer-isolated workspace</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950"><span className="mr-2 text-activeBlue">{portalOrder}</span>{heading}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{subheading}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

const portalSectionDescriptions: Record<string, string> = {
  'customer-register': 'Create a customer account, verify email/OTP, record PDPA consent, and optionally submit a repair request at the same time. / 创建客户账号、验证邮箱/OTP、记录隐私同意，并可选择同时提交报修。',
  'customer-login': 'Customer-only login. Customers cannot enter the central Admin backend. / 客户专用登录，客户不能进入总后台。',
  'submit-request': 'Customer chooses between New Repair Request and Warranty Claim before submitting details. / 客户先选择新增维修或保修范围申请，再提交资料。',
  'new-repair-request': 'Create a new repair service request linked to the logged-in customer when possible. / 创建新的维修报修单，并尽量绑定当前客户。',
  'warranty-claim': 'Select an existing warranty record and request review for in-warranty or out-of-warranty handling. / 选择已有保修记录，申请判断是否属于保修范围。',
  'my-repair-requests': 'RLS-filtered repair records bound to the current customer only. / 仅显示当前客户绑定的报修记录。',
  'my-quotations': 'RLS-filtered quotation records for the current customer. / 仅显示当前客户报价。',
  'my-invoices': 'RLS-filtered invoice records for the current customer. / 仅显示当前客户发票。',
  'my-payments-receipts': 'Customer payment status, receipt downloads and payment proof uploads. / 客户付款状态、收据下载和付款证明上传。',
  'my-warranties': 'Active, expiring and expired warranties, terms and QR-linked records. / 有效、即将到期和已过期保修、条款与二维码绑定记录。',
  'submit-review': 'Submit a review with rating, text, optional media and public display choices. / 提交评价、星级、文字、可选图片视频和公开展示选择。',
  'my-reviews': 'Track pending, approved, rejected, archived and deletion/revision requests. / 查看待审核、已批准、已驳回、已存档及删除/修改请求。',
  'review-privacy-settings': 'Choose which personal information may be public or hidden in reviews. / 选择评价中哪些个人信息可以公开或隐藏。'
};

export function CustomerPortalAnchors() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {customerLinks.map((link) => {
        const id = link.href.split('#')[1];
        return (
          <section key={link.href} id={id} className="scroll-mt-32 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">{link.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{link.zh}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{portalSectionDescriptions[id]}</p>
          </section>
        );
      })}
    </div>
  );
}
