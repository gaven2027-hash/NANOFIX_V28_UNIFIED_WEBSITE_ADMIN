export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialPreview } from '@/components/SocialPreview';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="社媒管理" title="Social Media Management" description="Manage social inbox, AI replies and multi-platform content review. / 管理社媒收件箱、AI 回复和多平台内容审核。" />
      <><SocialPreview /><MenuAnchorSections route="/social-media" /></>
    </AdminShell>
  );
}
