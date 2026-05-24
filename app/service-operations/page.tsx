export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { ServiceOperationsWorkspace } from '@/components/ServiceOperationsWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="业务订单处理"
        title="Service & Order Operations"
        description="Operable Dispatch Board linked to Supabase records: Lead → Inspection → Quotation → Work Execution → Finance → Warranty. / 可操作真实业务看板，连接 Supabase 业务数据。"
      />
      <ServiceOperationsWorkspace mode="board" />
    </AdminShell>
  );
}
