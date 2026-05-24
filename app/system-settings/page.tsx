export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SystemSettingsWorkspace } from '@/components/SystemSettingsWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="网站与系统设置"
        title="Website & System Settings"
        description="Operable settings backend connected to Supabase setting records, backups, RBAC summaries, audit logs, health checks and version snapshots. / 已连接 Supabase 真实设置记录、备份、权限、审计、健康检查和版本快照。"
      />
      <SystemSettingsWorkspace />
    </AdminShell>
  );
}
