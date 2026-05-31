export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { ServiceOperationsLiveCore } from '@/components/ServiceOperationsLiveCore';
import { ServiceOperationsServiceRequestsWorkspace } from '@/components/ServiceOperationsServiceRequestsWorkspace';
import { ServiceOperationsServiceRequestDetailWorkspace } from '@/components/ServiceOperationsServiceRequestDetailWorkspace';
import { ServiceOperationsCreateJobWorkspace } from '@/components/ServiceOperationsCreateJobWorkspace';
import { ServiceOperationsAssignEngineerWorkspace } from '@/components/ServiceOperationsAssignEngineerWorkspace';
import { ServiceOperationsInspectionResultWorkspace } from '@/components/ServiceOperationsInspectionResultWorkspace';
import { ServiceOperationsQuotationLiveWorkspace } from '@/components/ServiceOperationsQuotationLiveWorkspace';
import { ServiceOperationsDedicatedForms } from '@/components/ServiceOperationsDedicatedForms';
import { ServiceOperationsFinancialEditors } from '@/components/ServiceOperationsFinancialEditors';
import { ServiceOperationsFinancialVisibility } from '@/components/ServiceOperationsFinancialVisibility';
import { ServiceOperationsPaymentIntentPanel } from '@/components/ServiceOperationsPaymentIntentPanel';
import { ServiceOperationsCheckoutSessionPanel } from '@/components/ServiceOperationsCheckoutSessionPanel';
import { ServiceOperationsInvoicePdfPanel } from '@/components/ServiceOperationsInvoicePdfPanel';
import { ServiceOperationsQuotationPdfPanel } from '@/components/ServiceOperationsQuotationPdfPanel';
import { ServiceOperationsWarrantyPdfPanel } from '@/components/ServiceOperationsWarrantyPdfPanel';
import { ServiceOperationsDocumentSettingsPanel } from '@/components/ServiceOperationsDocumentSettingsPanel';
import { ServiceOperationsQuoteResponsePanel } from '@/components/ServiceOperationsQuoteResponsePanel';
import { ServiceOperationsCustomerDocumentFeedbackPanel } from '@/components/ServiceOperationsCustomerDocumentFeedbackPanel';
import { ServiceOperationsCustomerDocumentControlPanel } from '@/components/ServiceOperationsCustomerDocumentControlPanel';
import { ServiceOperationsCustomerPortalIntakePanel } from '@/components/ServiceOperationsCustomerPortalIntakePanel';
import { ServiceOperationsWarrantyClaimReviewPanel } from '@/components/ServiceOperationsWarrantyClaimReviewPanel';
import { ServiceOperationsWarrantyClaimRoutingPanel } from '@/components/ServiceOperationsWarrantyClaimRoutingPanel';
import { ServiceOperationsWarrantyClaimMessageReplyPanel } from '@/components/ServiceOperationsWarrantyClaimMessageReplyPanel';
import { ServiceOperationsWarrantyClaimAttachmentReviewPanel } from '@/components/ServiceOperationsWarrantyClaimAttachmentReviewPanel';
import { ServiceOperationsWarrantyClaimClosurePanel } from '@/components/ServiceOperationsWarrantyClaimClosurePanel';
import { ServiceOperationsWarrantyClaimSatisfactionFollowupPanel } from '@/components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel';
import { ServiceOperationsWarrantySatisfactionNotificationRulesPanel } from '@/components/ServiceOperationsWarrantySatisfactionNotificationRulesPanel';
import { ServiceOperationsWarrantySatisfactionAuditTrailPanel } from '@/components/ServiceOperationsWarrantySatisfactionAuditTrailPanel';
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
        <ServiceOperationsServiceRequestsWorkspace />
        <ServiceOperationsServiceRequestDetailWorkspace />
        <ServiceOperationsCreateJobWorkspace />
        <ServiceOperationsAssignEngineerWorkspace />
        <ServiceOperationsInspectionResultWorkspace />
        <ServiceOperationsQuotationLiveWorkspace />
        <ServiceOperationsDedicatedForms />
        <ServiceOperationsCustomerPortalIntakePanel />
        <ServiceOperationsWarrantyClaimReviewPanel />
        <ServiceOperationsWarrantyClaimRoutingPanel />
        <ServiceOperationsWarrantyClaimMessageReplyPanel />
        <ServiceOperationsWarrantyClaimAttachmentReviewPanel />
        <ServiceOperationsWarrantyClaimClosurePanel />
        <ServiceOperationsWarrantyClaimSatisfactionFollowupPanel />
        <ServiceOperationsWarrantySatisfactionNotificationRulesPanel />
        <ServiceOperationsWarrantySatisfactionAuditTrailPanel />
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
        <ServiceOperationsWarrantyPdfPanel />
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
