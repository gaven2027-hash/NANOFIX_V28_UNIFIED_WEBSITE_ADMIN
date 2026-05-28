export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { Customer360 } from '@/components/Customer360';
import { CustomerCenterActionWorkspace } from '@/components/CustomerCenterActionWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="客户相关" title="Customer Center" description="View customer profiles, binding, reviews, privacy redaction, portal records and PDPA requests. / 查看客户档案、绑定、评价、隐私脱敏、门户记录和 PDPA 请求。" />
      <div className="space-y-6">
        <Customer360 />
        <CustomerCenterActionWorkspace />
        <MenuAnchorSections route="/customer-center" />
      </div>
    </AdminShell>
  );
}
