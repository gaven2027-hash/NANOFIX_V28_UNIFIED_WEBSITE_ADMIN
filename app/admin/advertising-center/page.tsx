import Link from 'next/link';
import { AdvertisingCenterWorkspace } from '@/components/AdvertisingCenterWorkspace';

export const metadata = {
  title: 'Advertising & Promotion Center / 广告投放与推广中心 | NANOFIX Admin',
  robots: { index: false, follow: false }
};

const quickLinks = [
  { href: '/admin/advertising-center', title: 'Overview / 总览', note: 'Campaigns, ROI, accounts, AI suggestions and approval gates.' },
  { href: '/admin/advertising-center/import', title: 'CSV / Excel Import / 导入', note: 'Paste daily platform export to update internal ad performance and ROI.' },
  { href: '/admin/advertising-center/insights', title: 'ROI Insights / ROI 分析', note: 'Platform comparison, daily trend and high-spend low-conversion alerts.' }
];

export default function Page() {
  return <div className="space-y-5"><section className="grid gap-3 xl:grid-cols-3">{quickLinks.map((item) => <Link key={item.href} href={item.href} className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue"><div className="text-sm font-black text-slate-950">{item.title}</div><p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item.note}</p></Link>)}</section><AdvertisingCenterWorkspace /></div>;
}
