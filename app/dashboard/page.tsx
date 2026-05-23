export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { Dashboard } from '@/components/Dashboard';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="数据分析、预警、待处理事项" title="Dashboard, Analytics & Alerts" description="Daily dashboard for tasks, alerts, intake and module health. / 每日仪表盘，查看任务、预警、入口和模块健康。" />
      <><Dashboard /><MenuAnchorSections route="/dashboard" /></>
    </AdminShell>
  );
}
