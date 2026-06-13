export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMediaManagementWorkspace } from '@/components/SocialMediaManagementWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';
import { AiSocialAdsOperationalClosurePanel } from '@/components/AiSocialAdsOperationalClosurePanel';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Social"
        title="Social Media Management"
        description="Manage social accounts, unified inbox, AI content drafts, preview, schedule approval, logs and performance."
      />
      <div className="space-y-6">
        <AiSocialAdsOperationalClosurePanel />
        <SocialMediaManagementWorkspace />
      </div>
      <div className="mt-6">
        <MenuAnchorSections route="/social-media" />
      </div>
    </AdminShell>
  );
}
