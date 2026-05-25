export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';
import { SocialAccountsBindingWorkspace } from '@/components/SocialAccountsBindingWorkspace';
import { SocialMultiPlatformPreviewWorkspace } from '@/components/SocialMultiPlatformPreviewWorkspace';
import { getSocialMediaSection, socialMediaSections } from '@/lib/nanofix/socialMediaConfig';

export function generateStaticParams() {
  return socialMediaSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getSocialMediaSection(resolvedParams.section);
  if (!section) notFound();

  const isSocialAccounts = section.key === 'social-accounts';
  const isMultiPlatformPreview = section.key === 'multi-platform-preview-review';

  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title={section.title}
        description={isSocialAccounts
          ? 'Bind and manage NANOFIX social media API account connections. / 绑定和管理 NANOFIX 社媒 API 账号连接。'
          : isMultiPlatformPreview
            ? 'One material upload, multi-platform AI drafts, side-by-side preview windows, admin approval and schedule snapshots. / 一次素材，多平台 AI 草稿，并排预览，管理员审核和排期快照。'
            : `${section.helper} / ${section.zh} 已接入真实社媒后台操作。`}
      />
      {isSocialAccounts ? <SocialAccountsBindingWorkspace /> : isMultiPlatformPreview ? <SocialMultiPlatformPreviewWorkspace /> : <SocialMediaManagementWorkspace section={section} />}
    </AdminShell>
  );
}
