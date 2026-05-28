export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { RbacTable } from '@/components/RbacTable';
import { BackupCenter } from '@/components/BackupCenter';
import { AutomationNotificationWorkspace } from '@/components/AutomationNotificationWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="网站与系统设置" title="Website & System Settings" description="Manage brand, APIs, RBAC, backup, automation, SLA, notifications and audit logs. / 管理品牌、接口、权限、备份、自动化、SLA、通知和审计日志。" />
      <div className="space-y-6">
        <BackupCenter />
        <RbacTable />
        <AutomationNotificationWorkspace />
        <MenuAnchorSections route="/system-settings" />
      </div>
    </AdminShell>
  );
}
