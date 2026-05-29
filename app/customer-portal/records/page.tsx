export const dynamic = 'force-dynamic';

import { CustomerPortalRecordsOverview } from '@/components/CustomerPortalRecordsOverview';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalRecordsOverview />
    </CustomerPortalShell>
  );
}
