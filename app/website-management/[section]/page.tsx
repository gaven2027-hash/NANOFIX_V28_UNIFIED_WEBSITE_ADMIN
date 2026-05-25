export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { WebsiteManagementWorkspace } from '@/components/WebsiteManagementWorkspace';
import { WebsiteSocialLinksWorkspace } from '@/components/WebsiteSocialLinksWorkspace';
import { getWebsiteSection, websiteSections } from '@/lib/nanofix/websiteManagementConfig';

export function generateStaticParams() {
  return websiteSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getWebsiteSection(resolvedParams.section);
  if (!section) notFound();

  const isContactSocialLinks = section.key === 'contact-social-links';

  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站后台管理"
        title={section.title}
        description={isContactSocialLinks
          ? 'Manage public website social icon URLs for Facebook, Instagram, TikTok and YouTube. / 管理官网前台 Facebook、Instagram、TikTok、YouTube 社媒图标链接。'
          : `${section.helper} / ${section.zh} 已接入真实 CMS 后台操作。`}
      />
      {isContactSocialLinks ? <WebsiteSocialLinksWorkspace /> : <WebsiteManagementWorkspace section={section} />}
    </AdminShell>
  );
}
