export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { DashboardWorkspace } from '@/components/DashboardWorkspace';
import { dashboardSections, getDashboardSection } from '@/lib/nanofix/dashboardConfig';

export function generateStaticParams() {
  return dashboardSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getDashboardSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="数据分析、预警、待处理事项"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实 Dashboard 明细。`}
      />
      <DashboardWorkspace section={section} />
    </AdminShell>
  );
}
