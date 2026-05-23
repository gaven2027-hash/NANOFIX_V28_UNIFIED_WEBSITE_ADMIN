export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { Customer360 } from '@/components/Customer360';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="客户相关" title="Customer Center" description="View customer profiles, binding, records, portal and PDPA requests. / 查看客户档案、绑定、记录、门户和 PDPA 请求。" />
      <><Customer360 /><MenuAnchorSections route="/customer-center" /></>
    </AdminShell>
  );
}
