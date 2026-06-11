export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { RbacTable } from '@/components/RbacTable';
import { BackupCenter } from '@/components/BackupCenter';
import { WorkflowSettingsWorkspace } from '@/components/WorkflowSettingsWorkspace';
import { SystemSettingsDiagnosticsWorkspace } from '@/components/SystemSettingsDiagnosticsWorkspace';
import { CustomerReviewLinkSettings } from '@/components/CustomerReviewLinkSettings';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="网站与系统设置" title="Website & System Settings" description="Manage brand, APIs, RBAC, customer review links, backup, automation settings, notification channels, SLA rules, diagnostics and audit logs. / 管理品牌、接口、权限、客户评论链接、备份、自动化设置、通知渠道、SLA 规则、诊断和审计日志。" />
      <div className="space-y-6">
        <CustomerReviewLinkSettings />
        <BackupCenter />
        <RbacTable />
        <WorkflowSettingsWorkspace />
        <SystemSettingsDiagnosticsWorkspace />
      </div>
    </AdminShell>
  );
}
