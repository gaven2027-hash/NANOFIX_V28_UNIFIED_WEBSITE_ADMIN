export const dynamic = 'force-dynamic';

import { CustomerPortalRequestAndFeedbackPanel } from '@/components/CustomerPortalRequestAndFeedbackPanel';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalRequestAndFeedbackPanel />
    </CustomerPortalShell>
  );
}
