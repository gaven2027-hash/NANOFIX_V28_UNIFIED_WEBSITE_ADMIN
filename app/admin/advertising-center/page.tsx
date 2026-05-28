import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { AdvertisingCenterWorkspace } from '@/components/AdvertisingCenterWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export const metadata = {
  title: 'Advertising & Promotion Center / 广告投放与推广中心 | NANOFIX Admin',
  robots: { index: false, follow: false }
};

const quickLinks = [
  { href: '/admin/advertising-center#campaign-dashboard', title: 'Overview / 总览', note: 'Campaigns, ROI, accounts, AI suggestions and approval gates.' },
  { href: '/admin/advertising-center#csv-excel-import', title: 'CSV / Excel Import / 导入', note: 'Paste daily platform export to update internal ad performance and ROI.' },
  { href: '/admin/advertising-center#roi-insights-alerts', title: 'ROI Insights / ROI 分析', note: 'Platform comparison, daily trend and high-spend low-conversion alerts.' },
  { href: '/admin/advertising-center#creatives-copy', title: 'Creatives & Copy / 素材文案', note: 'Create editable ad image, video, headline, CTA and landing page copy drafts.' },
  { href: '/admin/advertising-center#budgets-strategy', title: 'Budgets & Strategy / 预算策略', note: 'Submit budget changes, finance review and Super Admin final approval.' }
];

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="广告投放与推广中心"
        title="Advertising & Promotion Center"
        description="Unified paid acquisition, campaign ROI, Google/social promotion, budgets, creatives, approvals and Super Admin takeover. / 统一管理付费获客、广告 ROI、Google/社媒推广、预算、素材、审批和总管理员接管。"
      />
      <div className="space-y-5">
        <section className="grid gap-3 xl:grid-cols-5">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue"
            >
              <div className="text-sm font-black text-slate-950">{item.title}</div>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item.note}</p>
            </Link>
          ))}
        </section>
        <AdvertisingCenterWorkspace />
        <MenuAnchorSections route="/admin/advertising-center" />
      </div>
    </AdminShell>
  );
}
