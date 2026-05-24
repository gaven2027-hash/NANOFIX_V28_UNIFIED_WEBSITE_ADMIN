export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { DashboardWorkspace } from '@/components/DashboardWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="数据分析、预警、待处理事项"
        title="Dashboard, Analytics & Alerts"
        description="Operable live dashboard connected to Supabase records. KPI numbers can be clicked to open related detail records. / 已接入 Supabase 真实数据，数字卡片可点击查看对应明细。"
      />
      <DashboardWorkspace />
    </AdminShell>
  );
}
