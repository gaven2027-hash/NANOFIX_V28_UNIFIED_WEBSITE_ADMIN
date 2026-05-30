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
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|invoices|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not let customers mutate official quotation, invoice, warranty or payment records.`);

const requiredFiles = [
  'supabase/migrations/202605290019_customer_portal_unified_service_request_fields.sql',
  'app/api/customer-portal/service-requests/route.ts',
  'components/CustomerPortalRequestWorkspace.tsx',
  'components/CustomerPortalRequestAndFeedbackPanel.tsx',
  'app/customer-portal/page.tsx',
  'app/customer-portal/submit-request/page.tsx',
  'app/api/admin/service-operations/route.ts',
  'tools/verify-customer-portal-service-intake-flow.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4 warranty claim workflow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290019_customer_portal_unified_service_request_fields.sql');
  const customerApi = read('app/api/customer-portal/service-requests/route.ts');
  const portalWorkspace = read('components/CustomerPortalRequestWorkspace.tsx');
  const requestFeedbackPanel = read('components/CustomerPortalRequestAndFeedbackPanel.tsx');
  const portalPage = read('app/customer-portal/page.tsx');
  const submitPage = read('app/customer-portal/submit-request/page.tsx');
  const adminServiceOpsApi = read('app/api/admin/service-operations/route.ts');
  const customerPortalVerifier = read('tools/verify-customer-portal-service-intake-flow.mjs');
  const pkg = read('package.json');

  has(sql, [
    'alter table public.service_requests',
    'customer_portal_request_type',
    'new_repair',
    'warranty_repair',
    'related_warranty_id',
    'service_requests_origin_type_idx',
    'service_requests_related_warranty_idx',
    'alter table public.leads',
    'leads_origin_type_idx'
  ], 'Phase D.4 service request classification migration');

  has(customerApi, [
    "const REQUEST_TYPES = ['new_repair', 'warranty_repair']",
    "if (text === 'warranty_repair' || text === 'warranty_claim') return 'warranty_repair'",
    'warrantyBelongsToCustomer',
    "requestType === 'warranty_repair' && !isUuid(relatedWarrantyId)",
    'Warranty not found or not linked to this customer.',
    "sourcePlatform = requestType === 'warranty_repair' ? 'customer_portal_warranty_repair' : 'customer_portal_new_repair'",
    'unified_intake',
    'leads',
    'service_requests',
    "status: requestType === 'warranty_repair' ? 'warranty_review_required' : 'pending_review'",
    'related_warranty_id',
    'warranty_id',
    'createCustomerPortalTaskAndInbox',
    'internal_inbox_messages',
    'unified_tasks',
    'notification_outbox',
    'customer_portal_service_request_submit_to_unified_queue',
    'writeAuditLog'
  ], 'Phase D.4 customer portal warranty claim API');
  noSelectStar(customerApi, 'Phase D.4 customer portal warranty claim API');
  noCustomerDocumentMutation(customerApi, 'Phase D.4 customer portal warranty claim API');

  has(portalWorkspace, [
    "type RequestKind = 'new_repair' | 'warranty_claim'",
    "setRequestKind('warranty_claim')",
    'Warranty Claim / 保修范围申请',
    'Warranty ID / 保修记录 ID',
    'Warranty Code / 保修编号',
    'Original Job Reference / 原维修项目',
    'Suspected same issue recurring / 疑似原问题复发',
    '/api/customer-portal/service-requests',
    'Submit Warranty Claim / 提交保修范围申请'
  ], 'Phase D.4 customer portal warranty claim UI');
  noBrowserStorage(portalWorkspace, 'Phase D.4 customer portal warranty claim UI');

  has(requestFeedbackPanel, [
    'warranty_repair',
    '/api/customer-portal/service-requests',
    'customers cannot edit',
    'Submit to Unified Service Operations',
    'Document Feedback'
  ], 'Phase D.4 submit request and feedback panel');
  noBrowserStorage(requestFeedbackPanel, 'Phase D.4 submit request and feedback panel');

  has(portalPage, ['CustomerPortalRequestWorkspace'], 'Customer portal main page Phase D.4 entry');
  has(submitPage, ['CustomerPortalRequestAndFeedbackPanel'], 'Customer portal submit request page Phase D.4 entry');

  has(adminServiceOpsApi, [
    'request_origin',
    'customer_portal_request_type',
    'related_warranty_id',
    'portal_attachment_urls',
    'portal_customer_notes',
    'warranty_repair'
  ], 'Internal Admin service operations visibility for Phase D.4 warranty claims');
  noSelectStar(adminServiceOpsApi, 'Internal Admin service operations visibility for Phase D.4 warranty claims');

  has(customerPortalVerifier, [
    'new_repair',
    'warranty_repair',
    'related_warranty_id',
    'customer_portal_service_request_submit_to_unified_queue'
  ], 'Existing customer portal service intake verifier still covers D.4 baseline');

  has(pkg, [
    'verify:warranty-claim-workflow',
    'verify-warranty-claim-workflow.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4 warranty claim workflow gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-workflow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
