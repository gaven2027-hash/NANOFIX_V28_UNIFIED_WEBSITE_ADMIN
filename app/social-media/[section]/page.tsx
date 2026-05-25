export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';
import { SocialExpandedAccountsBindingWorkspace } from '@/components/SocialExpandedAccountsBindingWorkspace';
import { SocialMultiPlatformPreviewWorkspace } from '@/components/SocialMultiPlatformPreviewWorkspace';
import { SocialVideoRenderJobsWorkspace } from '@/components/SocialVideoRenderJobsWorkspace';
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
  const isVideoRenderJobs = section.key === 'social-video-render-jobs';

  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title={section.title}
        description={isSocialAccounts
          ? 'Bind and manage all NANOFIX social media API account connections and secret-name metadata. / 绑定和管理 NANOFIX 全部社媒 API 账号连接与密钥名称资料。'
          : isMultiPlatformPreview
            ? 'One material upload, multi-platform AI drafts, side-by-side preview windows, admin approval and schedule snapshots. / 一次素材，多平台 AI 草稿，并排预览，管理员审核和排期快照。'
            : isVideoRenderJobs
              ? 'Queue and audit future AI video rendering jobs from source videos, reference videos and uploaded clips. This page does not auto-publish. / 根据素材视频、参考视频和上传片段创建未来 AI 视频渲染任务队列；本页面不自动发布。'
              : `${section.helper} / ${section.zh} 已接入真实社媒后台操作。`}
      />
      {isSocialAccounts ? <SocialExpandedAccountsBindingWorkspace /> : isMultiPlatformPreview ? <SocialMultiPlatformPreviewWorkspace /> : isVideoRenderJobs ? <SocialVideoRenderJobsWorkspace /> : <SocialMediaManagementWorkspace section={section} />}
    </AdminShell>
  );
}
