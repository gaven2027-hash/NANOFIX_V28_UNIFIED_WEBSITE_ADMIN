export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { WebsiteManagementWorkspace } from '@/components/WebsiteManagementWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站后台管理"
        title="Website Management"
        description="Operable CMS workflow connected to Supabase website_pages, website_content_blocks and website_publish_versions. / 已连接 Supabase 真实 CMS 表的可操作网站后台。"
      />
      <WebsiteManagementWorkspace />
    </AdminShell>
  );
}
