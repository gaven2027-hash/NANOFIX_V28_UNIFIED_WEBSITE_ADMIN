import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not allow customers to mutate official documents.`);

const requiredFiles = [
  'supabase/migrations/202605290019_customer_portal_unified_service_request_fields.sql',
  'app/api/customer-portal/service-requests/route.ts',
  'components/CustomerPortalRequestAndFeedbackPanel.tsx',
  'app/customer-portal/submit-request/page.tsx',
  'components/CustomerPortalShell.tsx',
  'app/api/admin/service-operations/route.ts',
  'app/api/customer-portal/document-feedback/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing customer portal unified request flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290019_customer_portal_unified_service_request_fields.sql');
  const api = read('app/api/customer-portal/service-requests/route.ts');
  const panel = read('components/CustomerPortalRequestAndFeedbackPanel.tsx');
  const page = read('app/customer-portal/submit-request/page.tsx');
  const shell = read('components/CustomerPortalShell.tsx');
  const adminApi = read('app/api/admin/service-operations/route.ts');
  const feedbackApi = read('app/api/customer-portal/document-feedback/route.ts');

  has(sql, [
    'alter table public.service_requests',
    'request_origin',
    'customer_portal_request_type',
    'related_warranty_id',
    'portal_attachment_urls',
    'portal_customer_notes',
    'new_repair',
    'warranty_repair',
    'service_requests_origin_type_idx',
    'alter table public.leads',
    'leads_origin_type_idx'
  ], 'Unified request origin migration');

  has(api, [
    'unified_intake',
    'leads',
    'service_requests',
    'request_origin',
    'customer_portal_request_type',
    'new_repair',
    'warranty_repair',
    'related_warranty_id',
    'portal_attachment_urls',
    'portal_customer_notes',
    'customer_portal_service_request_submit_to_unified_queue',
    'customer_portal_service_request_created_in_unified_queue',
    'internal_inbox_messages',
    'notification_outbox',
    'writeAuditLog'
  ], 'Customer portal unified service request API');
  noCustomerDocumentMutation(api, 'Customer portal unified service request API');

  has(panel, [
    '/api/customer-portal/service-requests',
    'Unified Intake',
    'Service Requests',
    'Jobs',
    'new_repair',
    'warranty_repair',
    'Quotations, invoices and warranty documents are generated from official admin templates',
    'customers cannot edit',
    'Submit to Unified Service Operations',
    'Document Feedback'
  ], 'Customer portal request and feedback panel');
  noBrowserStorage(panel, 'Customer portal request and feedback panel');

  has(page, ['CustomerPortalRequestAndFeedbackPanel'], 'Customer portal submit request page');
  has(shell, ['/customer-portal/submit-request', 'Submit Request'], 'Customer portal shell navigation');
  has(adminApi, ['request_origin', 'customer_portal_request_type', 'related_warranty_id', 'portal_attachment_urls', 'portal_customer_notes'], 'Service Operations admin API');
  has(feedbackApi, ['customer_cannot_edit_documents', 'customer_document_feedback', 'verifyDocumentOwnership'], 'Customer document feedback API');
  noCustomerDocumentMutation(feedbackApi, 'Customer document feedback API');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-unified-request-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
