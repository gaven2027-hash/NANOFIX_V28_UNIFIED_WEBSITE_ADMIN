export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { PortalAdminManagement } from '@/components/PortalAdminManagement';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="客户门户管理"
        title="Customer Portal"
        description="Admin-side customer portal management. The standalone customer portal is available at /portal/customer. / 总后台内的客户门户管理页，独立客户门户在 /portal/customer。"
      />
      <PortalAdminManagement type="customer" />
    </AdminShell>
  );
}
