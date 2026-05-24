export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { EngineerPortalWorkspace } from '@/components/EngineerPortalWorkspace';
import { engineerPortalSections, getEngineerPortalSection } from '@/lib/nanofix/engineerPortalConfig';

export function generateStaticParams() {
  return engineerPortalSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getEngineerPortalSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="工程师门户管理"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实工程师门户后台操作。`}
      />
      <EngineerPortalWorkspace section={section} />
    </AdminShell>
  );
}
