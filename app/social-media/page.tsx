export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title="Social Media Management"
        description="Operable social media backend connected to Supabase records, inbox messages, AI drafts and publish versions. / 已连接 Supabase 真实数据的社媒后台：记录、消息、AI 草稿和发布版本。"
      />
      <SocialMediaManagementWorkspace />
    </AdminShell>
  );
}
