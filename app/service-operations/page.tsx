export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { ServiceOperationsLiveCore } from '@/components/ServiceOperationsLiveCore';
import { WorkflowBoard } from '@/components/WorkflowBoard';
import { ServiceOperationsActionPanel } from '@/components/ServiceOperationsActionPanel';
import { StatusMachineTable } from '@/components/StatusMachineTable';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="业务订单处理" title="Service & Order Operations" description="Manage lead, request, inspection, quote, job, payment, warranty and Super Admin override. / 管理线索、报修、查验、报价、工单、付款、保修和总管理员强制流转。" />
      <div className="space-y-6">
        <ServiceOperationsLiveCore />
        <WorkflowBoard />
        <ServiceOperationsActionPanel />
        <StatusMachineTable />
        <MenuAnchorSections route="/service-operations" />
      </div>
    </AdminShell>
  );
}
