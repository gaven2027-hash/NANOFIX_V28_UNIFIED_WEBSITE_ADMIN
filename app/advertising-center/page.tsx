export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { AdvertisingAccountConnectionCenter } from '@/components/AdvertisingAccountConnectionCenter';
import { AiSocialAdsOperationalClosurePanel } from '@/components/AiSocialAdsOperationalClosurePanel';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';
import { PageHeader } from '@/components/PageHeader';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Ads"
        title="Advertising Center"
        description="Connect paid accounts, review budgets, track campaign leads, and route qualified enquiries into Service Operations."
      />
      <div className="space-y-6">
        <AiSocialAdsOperationalClosurePanel />
        <AdvertisingAccountConnectionCenter />
        <MenuAnchorSections route="/advertising-center" />
      </div>
    </AdminShell>
  );
}
