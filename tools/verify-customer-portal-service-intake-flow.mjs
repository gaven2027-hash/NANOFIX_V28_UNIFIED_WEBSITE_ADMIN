import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noSelectStar = (content, label) => assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select star.`);
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);

const requiredFiles = [
  'supabase/migrations/202605290018_customer_portal_request_feedback_flow.sql',
  'app/api/customer-portal/requests/route.ts',
  'app/api/customer-portal/document-feedback/route.ts',
  'app/api/admin/service-operations/customer-portal-intake/route.ts',
  'components/CustomerPortalRequestAndFeedbackPanel.tsx',
  'components/ServiceOperationsCustomerPortalIntakePanel.tsx',
  'app/customer-portal/submit-request/page.tsx',
  'components/CustomerPortalShell.tsx',
  'app/service-operations/page.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing customer portal service intake file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290018_customer_portal_request_feedback_flow.sql');
  const customerRequestsApi = read('app/api/customer-portal/requests/route.ts');
  const feedbackApi = read('app/api/customer-portal/document-feedback/route.ts');
  const adminApi = read('app/api/admin/service-operations/customer-portal-intake/route.ts');
  const customerPanel = read('components/CustomerPortalRequestAndFeedbackPanel.tsx');
  const adminPanel = read('components/ServiceOperationsCustomerPortalIntakePanel.tsx');
  const customerPage = read('app/customer-portal/submit-request/page.tsx');
  const shell = read('components/CustomerPortalShell.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'Customer Portal submissions are source channels only',
    'service_requests',
    'customer_portal_requests',
    'customer_document_feedback',
    'new_repair',
    'warranty_repair',
    'customer_portal_request_id',
    'portal_source_type',
    'portal_related_warranty_id',
    'customer_submission_json',
    'customer_attachment_urls',
    'customers can read own portal requests',
    'service role can write customer portal requests',
    'customers can read own document feedback',
    'service role can write customer document feedback'
  ], 'Customer portal request feedback migration');

  has(customerRequestsApi, [
    'REQUEST_TYPES',
    'new_repair',
    'warranty_repair',
    'verifyWarrantyOwner',
    'customer_portal_requests',
    'insertServiceRequest',
    'service_requests',
    'customer_portal_request_id',
    'portal_source_type',
    'portal_related_warranty_id',
    'customer_submission_json',
    'customer_attachment_urls',
    'customer_portal_request_created_service_request',
    'internal_inbox_messages',
    'unified_tasks',
    'notification_outbox',
    'customer_portal_request_submit_to_service_operations'
  ], 'Customer portal request API');
  noSelectStar(customerRequestsApi, 'Customer portal request API');

  has(feedbackApi, [
    'customer_document_feedback',
    'customer_cannot_edit_documents',
    'customer_portal_document_feedback_submit',
    'internal_inbox_messages',
    'unified_tasks',
    'notification_outbox'
  ], 'Customer document feedback API');
  noSelectStar(feedbackApi, 'Customer document feedback API');

  has(adminApi, [
    'customer_portal_requests',
    'service_requests',
    'customer_document_feedback',
    'portal_source_type',
    'update_portal_request_status',
    'respond_document_feedback',
    'service_operations_customer_portal_intake_read',
    'service_operations_customer_portal_request_status_update',
    'service_operations_customer_document_feedback_respond'
  ], 'Admin customer portal intake API');
  noSelectStar(adminApi, 'Admin customer portal intake API');

  has(customerPanel, [
    'CustomerPortalRequestAndFeedbackPanel',
    '/api/customer-portal/requests',
    '/api/customer-portal/document-feedback',
    'New Repair / Warranty Repair',
    'Submit to Service Operations / 提交到统一工单',
    'Document Feedback / 单据反馈留言',
    '客户不能修改',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'Customer portal request and feedback panel');
  noBrowserStorage(customerPanel, 'Customer portal request and feedback panel');

  has(adminPanel, [
    'ServiceOperationsCustomerPortalIntakePanel',
    '/api/admin/service-operations/customer-portal-intake',
    'Unified Service Request Intake',
    'Portal Source Records',
    'Unified Service Requests',
    'Document Feedback',
    'All official quotations, invoices and warranties must be revised from Internal Admin templates'
  ], 'Service Operations customer portal intake panel');
  noBrowserStorage(adminPanel, 'Service Operations customer portal intake panel');

  has(customerPage, ['CustomerPortalRequestAndFeedbackPanel'], 'Customer submit request page');
  has(shell, ['Submit Request', '/customer-portal/submit-request'], 'Customer portal nav');
  has(servicePage, ['ServiceOperationsCustomerPortalIntakePanel'], 'Service Operations page');
  has(ready, ['customer_portal_requests', 'customer_document_feedback'], '/api/ready customer portal intake table checks');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-service-intake-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
