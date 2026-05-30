export const dynamic = 'force-dynamic';

import { CustomerPortalShell } from '@/components/CustomerPortalShell';
import { CustomerPortalWarrantyDownloads } from '@/components/CustomerPortalWarrantyDownloads';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalWarrantyDownloads />
    </CustomerPortalShell>
  );
}
