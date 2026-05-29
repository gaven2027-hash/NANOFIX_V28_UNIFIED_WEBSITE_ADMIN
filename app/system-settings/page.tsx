export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { RbacTable } from '@/components/RbacTable';
import { BackupCenter } from '@/components/BackupCenter';
import { WorkflowSettingsWorkspace } from '@/components/WorkflowSettingsWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="网站与系统设置" title="Website & System Settings" description="Manage brand, APIs, RBAC, backup, automation settings, notification channels, SLA rules and audit logs. / 管理品牌、接口、权限、备份、自动化设置、通知渠道、SLA 规则和审计日志。" />
      <div className="space-y-6">
        <BackupCenter />
        <RbacTable />
        <WorkflowSettingsWorkspace />
        <MenuAnchorSections route="/system-settings" />
      </div>
    </AdminShell>
  );
}
