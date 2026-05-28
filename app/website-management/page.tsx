export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { WebsiteManagementWorkspace } from '@/components/WebsiteManagementWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站后台管理"
        title="Website Management"
        description="Manage editable website content, homepage reviews, service testimonials, public forms, uploads, leads, media, preview, publish approval and version history. / 管理可编辑网站内容、首页评价、服务页评价、公开表单、上传、线索、媒体、预览、发布审批和版本历史。"
      />
      <WebsiteManagementWorkspace />
      <div className="mt-6">
        <MenuAnchorSections route="/website-management" />
      </div>
    </AdminShell>
  );
}
