export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { WebsiteManagementLiveCore } from '@/components/WebsiteManagementLiveCore';
import { WebsiteManagementWorkspace } from '@/components/WebsiteManagementWorkspace';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Website Admin"
        title="Website Management"
        description="Live CMS, public intake, leads, media, preview, publish approval and version history."
      />
      <div className="space-y-6">
        <WebsiteManagementLiveCore />
        <WebsiteManagementWorkspace />
      </div>
      <div className="mt-6">
        <MenuAnchorSections route="/website-management" />
      </div>
    </AdminShell>
  );
}
