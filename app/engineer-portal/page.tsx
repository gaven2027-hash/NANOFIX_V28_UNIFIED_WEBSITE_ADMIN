export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { PortalAdminManagement } from '@/components/PortalAdminManagement';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="工程师门户管理"
        title="Engineer Portal"
        description="Admin-side engineer portal management. The standalone engineer workspace is available at /portal/engineer. / 总后台内的工程师门户管理页，独立工程师工作台在 /portal/engineer。"
      />
      <PortalAdminManagement type="engineer" />
    </AdminShell>
  );
}
