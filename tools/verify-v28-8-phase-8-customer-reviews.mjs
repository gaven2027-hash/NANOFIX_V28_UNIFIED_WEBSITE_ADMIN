#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const customerFeedbackApi = read('app/api/customer-portal/document-feedback/route.ts');
const customerFeedbackPanel = read('components/CustomerDocumentFeedbackPanel.tsx');
const adminFeedbackApi = read('app/api/admin/service-operations/customer-document-feedback/route.ts');
const adminFeedbackPanel = read('components/ServiceOperationsCustomerDocumentFeedbackPanel.tsx');
const satisfactionApi = read('app/api/admin/service-operations/warranty-claim-satisfaction/route.ts');
const satisfactionPanel = read('components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel.tsx');
const serviceOpsPage = read('app/service-operations/page.tsx');
const customerFinancialPage = read('app/customer-portal/financial/page.tsx');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-8-customer-reviews-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 8 Customer Reviews & Feedback real module verification');
console.log('-------------------------------------------------------------------');

must(Boolean(baselineDoc), 'Phase 8 Customer Reviews baseline document exists');
must(baselineDoc.includes('Customer Reviews & Feedback Real Module Baseline') && baselineDoc.includes('Customer Feedback / 客户反馈'), 'Baseline document covers customer feedback chain');
must(baselineDoc.includes('Customer Satisfaction Follow-up / 满意度回访') && baselineDoc.includes('Public review safety rule'), 'Baseline document covers satisfaction follow-up and public review safety');
must(baselineDoc.includes('node tools/verify-v28-8-phase-8-customer-reviews.mjs'), 'Baseline document exposes direct Phase 8 verifier command');

// Customer document feedback API.
must(customerFeedbackApi.includes("const CUSTOMER_ROLES = ['customer']") && customerFeedbackApi.includes('requireActorApi(request, [...CUSTOMER_ROLES])'), 'Customer document feedback API is customer-role guarded');
must(customerFeedbackApi.includes("const DOCUMENT_TYPES = ['quotation', 'invoice', 'warranty', 'payment', 'other']"), 'Customer document feedback API supports quotation/invoice/warranty/payment/other document types');
must(customerFeedbackApi.includes("const FEEDBACK_TYPES = ['comment', 'change_request', 'dispute', 'clarification']"), 'Customer document feedback API supports comment/change/dispute/clarification feedback types');
must(customerFeedbackApi.includes('activeCustomerForProfile') && customerFeedbackApi.includes(".eq('account_status', 'active')"), 'Customer document feedback API resolves active customer profile');
must(customerFeedbackApi.includes('verifyDocumentOwnership') && customerFeedbackApi.includes("from('quotations')") && customerFeedbackApi.includes("from('invoices')") && customerFeedbackApi.includes("from('warranties')"), 'Customer document feedback API verifies quotation/invoice/warranty ownership');
must(customerFeedbackApi.includes("from('customer_document_feedback')") && customerFeedbackApi.includes("status: 'submitted'"), 'Customer document feedback API inserts submitted feedback records');
must(customerFeedbackApi.includes("from('unified_tasks')") && customerFeedbackApi.includes("from('task_events')") && customerFeedbackApi.includes("from('internal_inbox_messages')"), 'Customer document feedback API creates task, task event and inbox records');
must(customerFeedbackApi.includes("from('notification_outbox')") && customerFeedbackApi.includes('NANOFIX feedback received'), 'Customer document feedback API queues customer confirmation notification');
must(customerFeedbackApi.includes('customer_portal_document_feedback_read') && customerFeedbackApi.includes('customer_portal_document_feedback_submit') && customerFeedbackApi.includes('writeAuditLog'), 'Customer document feedback API writes read/submit audit logs');
must(customerFeedbackApi.includes('customer_cannot_edit_documents: true'), 'Customer document feedback API records customer cannot edit documents rule');
must(!/select\(['"]\*['"]\)/.test(customerFeedbackApi), 'Customer document feedback API does not use select star');

// Customer feedback UI.
must(customerFeedbackPanel.includes('/api/customer-portal/document-feedback') && customerFeedbackPanel.includes('Submit Feedback / 提交反馈'), 'Customer feedback UI calls customer feedback API and submits feedback');
must(customerFeedbackPanel.includes('Feedback on Quotation, Invoice or Warranty') && customerFeedbackPanel.includes('不能直接修改报价、发票或保修单'), 'Customer feedback UI states document feedback/no direct edits');
must(customerFeedbackPanel.includes('change_request') && customerFeedbackPanel.includes('clarification') && customerFeedbackPanel.includes('dispute'), 'Customer feedback UI exposes feedback type choices');
must(customerFeedbackPanel.includes('My Feedback / 我的反馈') && customerFeedbackPanel.includes('Admin Response / 后台回复'), 'Customer feedback UI shows own feedback history and admin response');
must(customerFeedbackPanel.includes("credentials: 'same-origin'") && customerFeedbackPanel.includes("cache: 'no-store'"), 'Customer feedback UI uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(customerFeedbackPanel), 'Customer feedback UI does not use browser storage workflow state');

// Admin feedback review API.
must(adminFeedbackApi.includes("const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer']") && adminFeedbackApi.includes("const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support']"), 'Admin feedback review API has internal read/write role boundary');
must(adminFeedbackApi.includes("const STATUS_VALUES = ['reviewing', 'resolved', 'rejected', 'superseded']"), 'Admin feedback review API supports review statuses');
must(adminFeedbackApi.includes("from('customer_document_feedback')") && adminFeedbackApi.includes('feedback_id,customer_id,submitted_by_profile_id,document_type,document_id,related_job_id,feedback_type,message,status'), 'Admin feedback review API reads feedback with required fields');
must(adminFeedbackApi.includes('review_customer_document_feedback') && adminFeedbackApi.includes('reviewed_by') && adminFeedbackApi.includes('reviewed_at'), 'Admin feedback review API supports guarded review update');
must(adminFeedbackApi.includes("from('unified_tasks')") && adminFeedbackApi.includes('admin_can_repush_document') && adminFeedbackApi.includes('customer_cannot_edit_documents'), 'Admin feedback review API creates follow-up task and preserves document control rules');
must(adminFeedbackApi.includes("from('notification_outbox')") && adminFeedbackApi.includes('NANOFIX document feedback reviewed'), 'Admin feedback review API queues customer reviewed notification');
must(adminFeedbackApi.includes('service_operations_customer_document_feedback_read') && adminFeedbackApi.includes('service_operations_customer_document_feedback_review') && adminFeedbackApi.includes('writeAuditLog'), 'Admin feedback review API writes read/review audit logs');
must(!/select\(['"]\*['"]\)/.test(adminFeedbackApi), 'Admin feedback review API does not use select star');

// Admin feedback review UI.
must(adminFeedbackPanel.includes('/api/admin/service-operations/customer-document-feedback') && adminFeedbackPanel.includes('review_customer_document_feedback'), 'Admin feedback panel calls guarded admin feedback API');
must(adminFeedbackPanel.includes('Review Customer Feedback and Re-Push from Admin Templates') && adminFeedbackPanel.includes('不能修改报价、发票、保修单或付款内容'), 'Admin feedback panel states admin review and no customer direct edits');
must(adminFeedbackPanel.includes('reviewing') && adminFeedbackPanel.includes('resolved') && adminFeedbackPanel.includes('rejected') && adminFeedbackPanel.includes('superseded'), 'Admin feedback panel exposes review statuses');
must(adminFeedbackPanel.includes('Changing document content must be done in Quotation PDF / Invoice PDF / Warranty template modules'), 'Admin feedback panel warns document changes happen via template modules');
must(adminFeedbackPanel.includes("credentials: 'same-origin'") && adminFeedbackPanel.includes("cache: 'no-store'"), 'Admin feedback panel uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(adminFeedbackPanel), 'Admin feedback panel does not use browser storage workflow state');

// Warranty satisfaction follow-up API.
must(satisfactionApi.includes("const READ_ROLES = ['super_admin', 'operations_admin', 'support', 'finance', 'engineer']") && satisfactionApi.includes("const WRITE_ROLES = ['super_admin', 'operations_admin', 'support']"), 'Satisfaction follow-up API has internal read/write role boundary');
must(satisfactionApi.includes("from('service_requests')") && satisfactionApi.includes("customer_portal_request_type', 'warranty_repair'") && satisfactionApi.includes('warranty_claim_customer_satisfaction_status'), 'Satisfaction follow-up API reads warranty claim satisfaction from service_requests');
must(satisfactionApi.includes('not_satisfied') && satisfactionApi.includes('reopened') && satisfactionApi.includes('satisfied'), 'Satisfaction follow-up API supports satisfaction filters');
must(satisfactionApi.includes("from('warranty_claim_messages')") && satisfactionApi.includes('recent_messages'), 'Satisfaction follow-up API reads warranty claim recent messages');
must(satisfactionApi.includes('Follow-up dashboard actions are intended for not_satisfied or reopened warranty claims'), 'Satisfaction follow-up API guards actions to not_satisfied/reopened claims');
must(satisfactionApi.includes('warranty_claim_next_action') && satisfactionApi.includes('warranty_claim_routing_status') && satisfactionApi.includes('follow_up_in_progress'), 'Satisfaction follow-up API updates next action and routing status');
must(satisfactionApi.includes("from('warranty_claim_messages')") && satisfactionApi.includes('visible_to_customer') && satisfactionApi.includes('internal_only'), 'Satisfaction follow-up API inserts customer-visible/internal messages');
must(satisfactionApi.includes("from('unified_tasks')") && satisfactionApi.includes("from('task_events')") && satisfactionApi.includes("from('internal_inbox_messages')"), 'Satisfaction follow-up API creates task, task event and inbox records');
must(satisfactionApi.includes("from('notification_outbox')") && satisfactionApi.includes('NANOFIX followed up on your warranty claim feedback'), 'Satisfaction follow-up API queues customer notification for visible replies');
must(satisfactionApi.includes('service_operations_warranty_claim_satisfaction_followup_read') && satisfactionApi.includes('service_operations_warranty_claim_satisfaction_followup_submit') && satisfactionApi.includes('writeAuditLog'), 'Satisfaction follow-up API writes read/submit audit logs');
must(!/select\(['"]\*['"]\)/.test(satisfactionApi), 'Satisfaction follow-up API does not use select star');

// Satisfaction follow-up UI.
must(satisfactionPanel.includes('/api/admin/service-operations/warranty-claim-satisfaction') && satisfactionPanel.includes('Warranty Claim Satisfaction Follow-up'), 'Satisfaction follow-up UI calls admin satisfaction API');
must(satisfactionPanel.includes('not_satisfied only') && satisfactionPanel.includes('reopened only') && satisfactionPanel.includes('satisfied only'), 'Satisfaction follow-up UI exposes satisfaction filters');
must(satisfactionPanel.includes('Rating:') && satisfactionPanel.includes('Confirmed:') && satisfactionPanel.includes('Reopened:'), 'Satisfaction follow-up UI shows rating/confirmation/reopen fields');
must(satisfactionPanel.includes('Visible to customer / 客户可见') && satisfactionPanel.includes('Customer Reply / 回复客户') && satisfactionPanel.includes('Internal Note / 内部备注'), 'Satisfaction follow-up UI supports customer-visible reply and internal note');
must(satisfactionPanel.includes('不会修改报价、发票、保修单或付款记录'), 'Satisfaction follow-up UI warns it does not edit official records');
must(satisfactionPanel.includes("credentials: 'same-origin'") && satisfactionPanel.includes("cache: 'no-store'"), 'Satisfaction follow-up UI uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(satisfactionPanel), 'Satisfaction follow-up UI does not use browser storage workflow state');

// Page mounting.
must(serviceOpsPage.includes('ServiceOperationsCustomerDocumentFeedbackPanel'), 'Service Operations page mounts customer document feedback review panel');
must(serviceOpsPage.includes('ServiceOperationsWarrantyClaimSatisfactionFollowupPanel'), 'Service Operations page mounts warranty satisfaction follow-up panel');
must(serviceOpsPage.includes('ServiceOperationsWarrantySatisfactionNotificationRulesPanel'), 'Service Operations page mounts warranty satisfaction notification rules panel');
must(serviceOpsPage.includes('ServiceOperationsWarrantySatisfactionAuditTrailPanel'), 'Service Operations page mounts warranty satisfaction audit trail panel');
must(customerFinancialPage.includes('CustomerDocumentFeedbackPanel'), 'Customer Financial page mounts document feedback panel');

// Production readiness chain.
for (const table of ['customer_document_feedback','customer_portal_requests','warranty_claims','service_requests','warranties','jobs','customers','unified_tasks','task_events','audit_logs']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Customer Reviews chain table ${table}`);
}
for (const table of ['notification_outbox','internal_inbox_messages','app_modules']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Customer Reviews support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

// Public publishing safety.
must(!customerFeedbackApi.includes('published') && !adminFeedbackApi.includes('published'), 'Customer feedback APIs do not publish reviews publicly in Phase 8');
must(baselineDoc.includes('does not publish customer reviews publicly') && baselineDoc.includes('Website Publish Approval / Social Publish Approval'), 'Baseline documents public publishing approval safety rule');

warn(packageJson.includes('"verify:v28-8-phase-8-customer-reviews"'), 'package.json exposes V28.8 Phase 8 Customer Reviews npm alias');
warn(packageJson.includes('customer_document_feedback') || packageJson.includes('review'), 'Existing customer review/feedback verifier alias remains available');

if (failures.length) {
  console.error(`\nV28.8 Phase 8 Customer Reviews verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-8-customer-reviews',
  failures,
  warnings,
  checked: {
    customerDocumentFeedbackChain: true,
    customerFeedbackUiBaseline: true,
    adminFeedbackReviewChain: true,
    warrantySatisfactionFollowupChain: true,
    customerReviewPublishingSafety: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
