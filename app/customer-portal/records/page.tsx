export const dynamic = 'force-dynamic';

import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalRecordsOverview } from '@/components/CustomerPortalRecordsOverview';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Records Overview"
        title="Service Records & Repair Progress / 服务记录与维修进度"
        description="Track new repairs, warranty claims, quotations, invoices, payments, warranties and linked documents. / 跟踪新维修、保修维修、报价、发票、付款、保修和关联文件。"
        primaryLabel="Track Progress / 跟踪进度"
        secondaryLabel="Read-Only Records / 只读记录"
      >
        <CustomerPortalRecordsOverview />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
