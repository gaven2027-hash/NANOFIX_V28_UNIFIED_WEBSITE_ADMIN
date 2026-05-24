export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SystemSettingsWorkspace } from '@/components/SystemSettingsWorkspace';
import { getSystemSettingsSection, systemSettingsSections } from '@/lib/nanofix/systemSettingsConfig';

export function generateStaticParams() {
  return systemSettingsSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getSystemSettingsSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站与系统设置"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实系统设置后台操作。`}
      />
      <SystemSettingsWorkspace section={section} />
    </AdminShell>
  );
}
