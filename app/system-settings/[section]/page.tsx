export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SystemSettingsWorkspace } from '@/components/SystemSettingsWorkspace';
import { AuthManagementPanel } from '@/components/AuthManagementPanel';
import { getSystemSettingsSection, systemSettingsSections } from '@/lib/nanofix/systemSettingsConfig';

export function generateStaticParams() {
  return systemSettingsSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getSystemSettingsSection(resolvedParams.section);
  if (!section) notFound();

  if (section.key === 'auth-management') {
    return (
      <AdminShell>
        <PageHeader
          eyebrow="网站与系统设置"
          title={section.title}
          description={`${section.helper} / 支持用户名、邮箱、手机号与 WhatsApp 注册资料管理，以及后台账号恢复动作。`}
        />
        <AuthManagementPanel />
      </AdminShell>
    );
  }

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
