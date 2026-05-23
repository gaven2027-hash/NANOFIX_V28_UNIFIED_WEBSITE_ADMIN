export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { StatusMachineTable } from '@/components/StatusMachineTable';
import { RbacTable } from '@/components/RbacTable';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="网站后台管理" title="Website Management" description="Manage website content, forms, leads and AI website drafts. / 管理网站内容、表单、线索和 AI 网站草稿。" />
      <><><StatusMachineTable /><div className="mt-6"><RbacTable /></div></><MenuAnchorSections route="/website-management" /></>
    </AdminShell>
  );
}
