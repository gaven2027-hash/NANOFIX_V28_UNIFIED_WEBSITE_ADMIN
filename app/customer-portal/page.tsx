export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerPortalWorkspace } from '@/components/CustomerPortalWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="客户会员中心入口"
        title="Customer Portal"
        description="Admin-side customer portal management connected to real service requests, quotations, invoices, payments, receipts and warranties. / 管理员侧客户门户管理，已连接真实报修、报价、发票、付款、收据和保修数据。"
      />
      <CustomerPortalWorkspace />
    </AdminShell>
  );
}
