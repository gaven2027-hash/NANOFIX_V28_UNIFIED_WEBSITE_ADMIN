export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { Dashboard } from '@/components/Dashboard';
import { AutomationNotificationWorkspace } from '@/components/AutomationNotificationWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="数据分析、预警、待处理事项" title="Dashboard, Analytics & Alerts" description="Daily dashboard for tasks, alerts, intake, automation, internal inbox and module health. / 每日仪表盘，查看任务、预警、入口、自动化、内部收件箱和模块健康。" />
      <><Dashboard /><AutomationNotificationWorkspace /><MenuAnchorSections route="/dashboard" /></>
    </AdminShell>
  );
}
