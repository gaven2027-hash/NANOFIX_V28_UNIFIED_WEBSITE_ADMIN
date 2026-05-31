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

const advertisingFullWidthCss = `
  .advertising-center-full-width,
  .advertising-center-full-width > *,
  .advertising-center-full-width section,
  .advertising-center-full-width article,
  .advertising-center-full-width [class*="rounded-3xl"],
  .advertising-center-full-width [class*="rounded-2xl"] {
    max-width: none !important;
    min-width: 0 !important;
  }

  .advertising-center-full-width {
    width: 100% !important;
    overflow-x: hidden !important;
  }

  .advertising-center-full-width .advertising-workspace-full,
  .advertising-center-full-width .advertising-workspace-full > div,
  .advertising-center-full-width .advertising-workspace-full > div > div,
  .advertising-center-full-width .advertising-workspace-full > div > section {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  .advertising-center-full-width .advertising-workspace-full [class*="xl:grid-cols"],
  .advertising-center-full-width .advertising-workspace-full [class*="xl:grid-cols-["],
  .advertising-center-full-width .advertising-workspace-full [class*="grid-cols-[420px"] {
    grid-template-columns: minmax(0, 1fr) !important;
    width: 100% !important;
  }

  .advertising-center-full-width .advertising-workspace-full table,
  .advertising-center-full-width .advertising-workspace-full .min-w-\[1120px\] {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: auto !important;
  }

  .advertising-center-full-width .advertising-workspace-full .overflow-x-auto {
    max-width: 100% !important;
    overflow-x: auto !important;
  }
`;

export default function Page() {
  return (
    <AdminShell>
      <style dangerouslySetInnerHTML={{ __html: advertisingFullWidthCss }} />
      <div className="advertising-center-full-width w-full max-w-none space-y-5">
        <PageHeader
          eyebrow="广告投放与推广中心"
          title="Advertising & Promotion Center"
          description="Unified paid acquisition, campaign ROI, Google/social promotion, budgets, creatives, approvals and Super Admin takeover. / 统一管理付费获客、广告 ROI、Google/社媒推广、预算、素材、审批和总管理员接管。"
        />
        <section className="grid w-full max-w-none gap-3 xl:grid-cols-5">
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
        <div className="advertising-workspace-full w-full max-w-none">
          <AdvertisingCenterWorkspace />
        </div>
        <div className="w-full max-w-none">
          <MenuAnchorSections route="/admin/advertising-center" />
        </div>
      </div>
    </AdminShell>
  );
}
