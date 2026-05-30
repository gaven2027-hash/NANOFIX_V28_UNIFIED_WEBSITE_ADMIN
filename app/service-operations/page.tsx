export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { ServiceOperationsLiveCore } from '@/components/ServiceOperationsLiveCore';
import { ServiceOperationsDedicatedForms } from '@/components/ServiceOperationsDedicatedForms';
import { ServiceOperationsFinancialEditors } from '@/components/ServiceOperationsFinancialEditors';
import { ServiceOperationsFinancialVisibility } from '@/components/ServiceOperationsFinancialVisibility';
import { ServiceOperationsPaymentIntentPanel } from '@/components/ServiceOperationsPaymentIntentPanel';
import { ServiceOperationsCheckoutSessionPanel } from '@/components/ServiceOperationsCheckoutSessionPanel';
import { ServiceOperationsInvoicePdfPanel } from '@/components/ServiceOperationsInvoicePdfPanel';
import { ServiceOperationsQuotationPdfPanel } from '@/components/ServiceOperationsQuotationPdfPanel';
import { ServiceOperationsDocumentSettingsPanel } from '@/components/ServiceOperationsDocumentSettingsPanel';
import { ServiceOperationsQuoteResponsePanel } from '@/components/ServiceOperationsQuoteResponsePanel';
import { ServiceOperationsCustomerDocumentFeedbackPanel } from '@/components/ServiceOperationsCustomerDocumentFeedbackPanel';
import { ServiceOperationsCustomerDocumentControlPanel } from '@/components/ServiceOperationsCustomerDocumentControlPanel';
import { ServiceOperationsCustomerPortalIntakePanel } from '@/components/ServiceOperationsCustomerPortalIntakePanel';
import { ServiceOperationsInspectionWorkspace } from '@/components/ServiceOperationsInspectionWorkspace';
import { ServiceOperationsStorageUploader } from '@/components/ServiceOperationsStorageUploader';
import { ServiceOperationsCustomerVisibility } from '@/components/ServiceOperationsCustomerVisibility';
import { WorkflowBoard } from '@/components/WorkflowBoard';
import { ServiceOperationsActionPanel } from '@/components/ServiceOperationsActionPanel';
import { StatusMachineTable } from '@/components/StatusMachineTable';
import { MenuAnchorSections } from '@/components/MenuAnchorSections';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="业务订单处理" title="Service & Order Operations" description="Manage lead, request, inspection, quote, job, payment, warranty and Super Admin override. / 管理线索、报修、查验、报价、工单、付款、保修和总管理员强制流转。" />
      <div className="space-y-6">
        <ServiceOperationsLiveCore />
        <ServiceOperationsDedicatedForms />
        <ServiceOperationsCustomerPortalIntakePanel />
        <ServiceOperationsCustomerDocumentControlPanel />
        <ServiceOperationsFinancialEditors />
        <ServiceOperationsFinancialVisibility />
        <ServiceOperationsPaymentIntentPanel />
        <ServiceOperationsCheckoutSessionPanel />
        <ServiceOperationsDocumentSettingsPanel />
        <ServiceOperationsQuoteResponsePanel />
        <ServiceOperationsCustomerDocumentFeedbackPanel />
        <ServiceOperationsQuotationPdfPanel />
        <ServiceOperationsInvoicePdfPanel />
        <ServiceOperationsInspectionWorkspace />
        <ServiceOperationsStorageUploader />
        <ServiceOperationsCustomerVisibility />
        <WorkflowBoard />
        <ServiceOperationsActionPanel />
        <StatusMachineTable />
        <MenuAnchorSections route="/service-operations" />
      </div>
    </AdminShell>
  );
}
