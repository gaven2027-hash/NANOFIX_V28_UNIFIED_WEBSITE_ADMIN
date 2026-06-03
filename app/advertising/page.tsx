export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { AdvertisingAccountConnectionCenter } from '@/components/AdvertisingAccountConnectionCenter';
import { AdvertisingCenterWorkspace } from '@/components/AdvertisingCenterWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="广告与获客"
        title="Advertising & Acquisition"
        description="Manage paid acquisition, ad account connections, campaign budgets, creatives, attribution, imported leads and AI advertising suggestions. / 管理付费获客、广告账号连接、广告预算、素材、归因、导入线索和 AI 广告建议。"
      />
      <div className="space-y-6">
        <AdvertisingAccountConnectionCenter />
        <AdvertisingCenterWorkspace />
        <MenuAnchorSections route="/advertising" />
      </div>
    </AdminShell>
  );
}
