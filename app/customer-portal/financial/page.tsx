export const dynamic = 'force-dynamic';

import { CustomerDocumentFeedbackPanel } from '@/components/CustomerDocumentFeedbackPanel';
import { CustomerPortalFinancialOverview } from '@/components/CustomerPortalFinancialOverview';
import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalPaymentIntentStatus } from '@/components/CustomerPortalPaymentIntentStatus';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Financial Centre"
        title="Quotations, Invoices & Payments / 报价、发票与付款"
        description="View customer-visible quotations, invoices and payment status. You can respond to quotations and review invoices without changing official records. / 查看客户可见报价、发票和付款状态；您可以回应报价和查看发票，但不能修改正式记录。"
        primaryLabel="Quote Response / 报价回应"
        secondaryLabel="Invoice View / 发票查看"
      >
        <CustomerPortalFinancialOverview />
        <CustomerPortalPaymentIntentStatus />
        <CustomerDocumentFeedbackPanel />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
