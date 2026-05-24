export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { WebsiteManagementWorkspace } from '@/components/WebsiteManagementWorkspace';
import { getWebsiteSection, websiteSections } from '@/lib/nanofix/websiteManagementConfig';

export function generateStaticParams() {
  return websiteSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getWebsiteSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站后台管理"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实 CMS 后台操作。`}
      />
      <WebsiteManagementWorkspace section={section} />
    </AdminShell>
  );
}
