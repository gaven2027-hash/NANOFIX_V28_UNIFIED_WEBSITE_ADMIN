export const dynamic = 'force-dynamic';

import { Customer360 } from '@/components/Customer360';
import { CustomerPortalDashboard } from '@/components/CustomerPortalDashboard';
import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalRequestWorkspace } from '@/components/CustomerPortalRequestWorkspace';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';
import { CustomerPortalDataLoop } from '@/components/PortalDataLoop';
import { CustomerPortalAnchors } from '@/components/PortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Customer Portal Dashboard"
        title="Your NANOFIX Service Centre / 您的 NANOFIX 服务中心"
        description="View service progress, submit repair requests, check quotations, invoices, warranties and customer records in one place. / 在一个页面查看服务进度、提交维修、查看报价、发票、保修和客户记录。"
        primaryLabel="Fast Actions / 快速操作"
        secondaryLabel="Linked Records / 关联记录"
      >
        <CustomerPortalDashboard />
        <CustomerPortalDataLoop />
        <CustomerPortalRequestWorkspace />
        <Customer360 />
        <CustomerPortalAnchors />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
