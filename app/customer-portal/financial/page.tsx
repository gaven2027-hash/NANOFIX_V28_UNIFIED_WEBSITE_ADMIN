export const dynamic = 'force-dynamic';

import { CustomerPortalFinancialOverview } from '@/components/CustomerPortalFinancialOverview';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalFinancialOverview />
    </CustomerPortalShell>
  );
}
