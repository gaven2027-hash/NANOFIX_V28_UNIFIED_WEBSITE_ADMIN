export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { EngineerPortalWorkspace } from '@/components/EngineerPortalWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="工程师门户管理"
        title="Engineer Portal"
        description="Admin-side engineer portal management connected to real jobs, inspections, checklists, photos, signatures and warranty-linked field records. / 管理员侧工程师门户管理，已连接真实工单、查验、清单、照片、签名和保修关联现场记录。"
      />
      <EngineerPortalWorkspace />
    </AdminShell>
  );
}
