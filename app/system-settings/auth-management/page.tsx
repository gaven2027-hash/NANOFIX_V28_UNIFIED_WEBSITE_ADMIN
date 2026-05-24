export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { AccountManagementWorkspace } from '@/components/AccountManagementWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="认证与账号管理"
        title="Auth Management"
        description="Review and manage member, engineer and administrator accounts, role assignment, approval status and account activation controls. / 审核和管理会员、工程师与管理员账号、角色分配、审核状态和启用控制。"
      />
      <AccountManagementWorkspace />
    </AdminShell>
  );
}
