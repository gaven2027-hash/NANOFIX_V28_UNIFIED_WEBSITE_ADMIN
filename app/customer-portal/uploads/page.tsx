export const dynamic = 'force-dynamic';

import { CustomerPortalApprovedUploads } from '@/components/CustomerPortalApprovedUploads';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalApprovedUploads />
    </CustomerPortalShell>
  );
}
