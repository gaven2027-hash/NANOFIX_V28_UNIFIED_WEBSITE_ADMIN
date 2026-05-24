export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';
import { getSocialMediaSection, socialMediaSections } from '@/lib/nanofix/socialMediaConfig';

export function generateStaticParams() {
  return socialMediaSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getSocialMediaSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实社媒后台操作。`}
      />
      <SocialMediaManagementWorkspace section={section} />
    </AdminShell>
  );
}
