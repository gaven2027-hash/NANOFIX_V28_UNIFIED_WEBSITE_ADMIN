export const dynamic = 'force-dynamic';

import { Customer360 } from '@/components/Customer360';
import { CustomerPortalDashboard } from '@/components/CustomerPortalDashboard';
import { CustomerPortalRequestWorkspace } from '@/components/CustomerPortalRequestWorkspace';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';
import { CustomerPortalDataLoop } from '@/components/PortalDataLoop';
import { CustomerPortalAnchors } from '@/components/PortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <div className="space-y-6">
        <CustomerPortalDashboard />
        <CustomerPortalDataLoop />
        <CustomerPortalRequestWorkspace />
        <Customer360 />
        <CustomerPortalAnchors />
      </div>
    </CustomerPortalShell>
  );
}
