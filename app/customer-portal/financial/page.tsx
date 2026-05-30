export const dynamic = 'force-dynamic';

import { CustomerDocumentFeedbackPanel } from '@/components/CustomerDocumentFeedbackPanel';
import { CustomerPortalFinancialOverview } from '@/components/CustomerPortalFinancialOverview';
import { CustomerPortalPaymentIntentStatus } from '@/components/CustomerPortalPaymentIntentStatus';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <div className="space-y-6">
        <CustomerPortalFinancialOverview />
        <CustomerPortalPaymentIntentStatus />
        <CustomerDocumentFeedbackPanel />
      </div>
    </CustomerPortalShell>
  );
}
