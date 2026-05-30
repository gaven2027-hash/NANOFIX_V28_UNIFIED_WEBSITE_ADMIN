export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { StatusMachineTable } from '@/components/StatusMachineTable';
import { SocialPreview } from '@/components/SocialPreview';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="AI 智能中心" title="AI Intelligence Center" description="AI supports search, content, conversations and lead discovery. / AI 辅助搜索、内容、对话和获客线索发现。" />
      <div className="space-y-6">
        <SocialPreview />
        <StatusMachineTable />
        <MenuAnchorSections route="/ai-intelligence" />
      </div>
    </AdminShell>
  );
}
