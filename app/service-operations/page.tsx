export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { WorkflowBoard } from '@/components/WorkflowBoard';
import { StatusMachineTable } from '@/components/StatusMachineTable';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="业务订单处理" title="Service & Order Operations" description="Manage lead, request, inspection, quote, job, payment and warranty. / 管理线索、报修、查验、报价、工单、付款和保修。" />
      <><><WorkflowBoard /><div className="mt-6"><StatusMachineTable /></div></><MenuAnchorSections route="/service-operations" /></>
    </AdminShell>
  );
}
