export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerCenterWorkspace } from '@/components/CustomerCenterWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="客户相关"
        title="Customer Center"
        description="Operable customer backend connected to Supabase customers, linked records, binding review, PDPA requests and version snapshots. / 已连接 Supabase 真实客户、关联记录、绑定审核、PDPA 和版本快照。"
      />
      <CustomerCenterWorkspace />
    </AdminShell>
  );
}
