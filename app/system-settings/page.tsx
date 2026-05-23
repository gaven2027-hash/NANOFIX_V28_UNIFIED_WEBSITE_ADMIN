export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { RbacTable } from '@/components/RbacTable';
import { BackupCenter } from '@/components/BackupCenter';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="网站与系统设置" title="Website & System Settings" description="Manage brand, APIs, search, QR, backup, roles and audit logs. / 管理品牌、接口、搜索、二维码、备份、角色和审计日志。" />
      <><><BackupCenter /><div className="mt-6"><RbacTable /></div></><MenuAnchorSections route="/system-settings" /></>
    </AdminShell>
  );
}
