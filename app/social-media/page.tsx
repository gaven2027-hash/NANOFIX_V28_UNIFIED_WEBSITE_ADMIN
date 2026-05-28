export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title="Social Media Management"
        description="Manage social accounts, Google Business Profile, unified inbox, WhatsApp AI replies, organic leads, AI content drafts, multi-platform preview, schedule approval, logs and performance. / 管理社媒账号、Google 商家资料、统一收件箱、WhatsApp AI 回复、自然线索、AI 内容草稿、多平台预览、排期审批、日志和表现。"
      />
      <SocialMediaManagementWorkspace />
      <div className="mt-6">
        <MenuAnchorSections route="/social-media" />
      </div>
    </AdminShell>
  );
}
