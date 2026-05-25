export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { ModuleHealthWorkspace } from '@/components/ModuleHealthWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站与系统设置"
        title="Health Checks / 健康检查"
        description="Review module health status, degraded mode records and recent health events. Dashboard links can open a specific module directly. / 查看模块健康状态、降级记录和最近健康事件，仪表盘可直接打开指定模块。"
      />
      <ModuleHealthWorkspace />
    </AdminShell>
  );
}
