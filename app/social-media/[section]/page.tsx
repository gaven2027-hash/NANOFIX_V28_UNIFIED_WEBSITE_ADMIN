export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';
import { SocialAccountsBindingWorkspace } from '@/components/SocialAccountsBindingWorkspace';
import { getSocialMediaSection, socialMediaSections } from '@/lib/nanofix/socialMediaConfig';

export function generateStaticParams() {
  return socialMediaSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getSocialMediaSection(resolvedParams.section);
  if (!section) notFound();

  const isSocialAccounts = section.key === 'social-accounts';

  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title={section.title}
        description={isSocialAccounts
          ? 'Bind and manage NANOFIX social media API account connections. / 绑定和管理 NANOFIX 社媒 API 账号连接。'
          : `${section.helper} / ${section.zh} 已接入真实社媒后台操作。`}
      />
      {isSocialAccounts ? <SocialAccountsBindingWorkspace /> : <SocialMediaManagementWorkspace section={section} />}
    </AdminShell>
  );
}
