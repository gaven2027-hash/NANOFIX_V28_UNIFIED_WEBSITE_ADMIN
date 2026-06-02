export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { Customer360 } from '@/components/Customer360';
import { CustomerCenterActionWorkspace } from '@/components/CustomerCenterActionWorkspace';
import { AddOfflineCustomerForm } from '@/components/AddOfflineCustomerForm';
import { UnclaimedCustomerProfilesPanel } from '@/components/UnclaimedCustomerProfilesPanel';
import { AdminCustomerDocumentsPanel } from '@/components/AdminCustomerDocumentsPanel';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="客户相关" title="Customer Center" description="View customer profiles, add offline unclaimed customers, binding, reviews, privacy redaction, portal records, PDPA requests, and customer quotations / invoices / warranties. / 查看客户档案、后台代录未认领客户、绑定、评价、隐私脱敏、门户记录、PDPA 请求，以及客户报价、发票和保修单。" />
      <div className="space-y-6">
        <AddOfflineCustomerForm />
        <UnclaimedCustomerProfilesPanel />
        <Customer360 />
        <CustomerCenterActionWorkspace />
        <AdminCustomerDocumentsPanel />
        <MenuAnchorSections route="/customer-center" />
      </div>
    </AdminShell>
  );
}
