import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noSelectStar = (content, label) => assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select star.`);
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not mutate official quotation, invoice, warranty or payment records.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const phaseFiles = [
  'supabase/migrations/202605300001_warranty_claim_workflow.sql',
  'supabase/migrations/202605300002_warranty_claim_routing.sql',
  'supabase/migrations/202605300003_warranty_claim_messages.sql',
  'supabase/migrations/202605300004_warranty_claim_completion_closure.sql',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/messages/route.ts',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/attachments/route.ts',
  'app/api/admin/service-operations/warranty-claim-review/route.ts',
  'app/api/admin/service-operations/warranty-claim-routing/route.ts',
  'app/api/admin/service-operations/warranty-claim-messages/route.ts',
  'app/api/admin/service-operations/warranty-claim-attachments/route.ts',
  'app/api/admin/service-operations/warranty-claim-closure/route.ts',
  'app/customer-portal/warranty-claims/[serviceRequestId]/page.tsx',
  'components/CustomerPortalRecordsOverview.tsx',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'components/CustomerPortalWarrantyClaimAttachmentsPanel.tsx',
  'components/ServiceOperationsWarrantyClaimReviewPanel.tsx',
  'components/ServiceOperationsWarrantyClaimRoutingPanel.tsx',
  'components/ServiceOperationsWarrantyClaimMessageReplyPanel.tsx',
  'components/ServiceOperationsWarrantyClaimAttachmentReviewPanel.tsx',
  'components/ServiceOperationsWarrantyClaimClosurePanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-claim-workflow.mjs',
  'tools/verify-warranty-claim-admin-review.mjs',
  'tools/verify-warranty-claim-routing.mjs',
  'tools/verify-customer-portal-warranty-claim-tracking.mjs',
  'tools/verify-customer-portal-warranty-claim-detail.mjs',
  'tools/verify-customer-portal-warranty-claim-timeline.mjs',
  'tools/verify-customer-portal-warranty-claim-message-thread.mjs',
  'tools/verify-internal-warranty-claim-message-reply.mjs',
  'tools/verify-customer-portal-warranty-claim-attachments.mjs',
  'tools/verify-internal-warranty-claim-attachment-review.mjs',
  'tools/verify-warranty-claim-completion-closure.mjs',
  'tools/verify-warranty-claim-final-summary-card.mjs',
  'package.json'
];

for (const file of phaseFiles) assert(exists(file), `Missing Phase D.4 consolidation file: ${file}`);

if (phaseFiles.every(exists)) {
  const pkg = read('package.json');
  const customerDetailApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts');
  const customerMessagesApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/messages/route.ts');
  const customerAttachmentsApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/attachments/route.ts');
  const adminReviewApi = read('app/api/admin/service-operations/warranty-claim-review/route.ts');
  const adminRoutingApi = read('app/api/admin/service-operations/warranty-claim-routing/route.ts');
  const adminMessagesApi = read('app/api/admin/service-operations/warranty-claim-messages/route.ts');
  const adminAttachmentsApi = read('app/api/admin/service-operations/warranty-claim-attachments/route.ts');
  const adminClosureApi = read('app/api/admin/service-operations/warranty-claim-closure/route.ts');
  const customerDetail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const customerRecords = read('components/CustomerPortalRecordsOverview.tsx');
  const customerAttachments = read('components/CustomerPortalWarrantyClaimAttachmentsPanel.tsx');
  const serviceOpsPage = read('app/service-operations/page.tsx');
  const closureSql = read('supabase/migrations/202605300004_warranty_claim_completion_closure.sql');
  const messageSql = read('supabase/migrations/202605300003_warranty_claim_messages.sql');

  const orderedScripts = [
    'verify:warranty-claim-workflow',
    'verify:warranty-claim-admin-review',
    'verify:warranty-claim-routing',
    'verify:customer-warranty-claim-tracking',
    'verify:customer-warranty-claim-detail',
    'verify:customer-warranty-claim-timeline',
    'verify:customer-warranty-claim-message-thread',
    'verify:internal-warranty-claim-message-reply',
    'verify:customer-warranty-claim-attachments',
    'verify:internal-warranty-claim-attachment-review',
    'verify:warranty-claim-completion-closure',
    'verify:warranty-claim-final-summary-card',
    'verify:warranty-claim-predeploy-consolidation'
  ];
  for (const script of orderedScripts) has(pkg, [script], 'package Phase D.4 verifier scripts');
  const predeploy = pkg.match(/"validate:predeploy"\s*:\s*"([^"]+)"/)?.[1] ?? '';
  for (const script of orderedScripts) assert(predeploy.includes(`npm run ${script}`), `validate:predeploy missing ${script}`);
  for (let index = 0; index < orderedScripts.length - 1; index += 1) {
    assert(predeploy.indexOf(`npm run ${orderedScripts[index]}`) < predeploy.indexOf(`npm run ${orderedScripts[index + 1]}`), `validate:predeploy order broken between ${orderedScripts[index]} and ${orderedScripts[index + 1]}`);
  }

  const allApi = [customerDetailApi, customerMessagesApi, customerAttachmentsApi, adminReviewApi, adminRoutingApi, adminMessagesApi, adminAttachmentsApi, adminClosureApi].join('\n');
  has(allApi, [
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'writeAuditLog',
    'service_request_id'
  ], 'Phase D.4 API shared warranty claim boundaries');
  noSelectStar(allApi, 'Phase D.4 consolidated APIs');
  noCustomerDocumentMutation(allApi, 'Phase D.4 consolidated APIs');

  has(customerDetailApi, [
    'customer_portal_warranty_claim_detail_read',
    'customer_timeline',
    'warranty_claim_completed',
    'warranty_claim_closed',
    'visible_to_customer',
    'createSignedUrl'
  ], 'Customer Portal warranty claim detail API consolidation');

  has(customerMessagesApi, [
    'customer_portal_warranty_claim_messages_read',
    'customer_portal_warranty_claim_message_submit',
    'warranty_claim_messages',
    'unified_tasks',
    'internal_inbox_messages',
    'notification_outbox'
  ], 'Customer Portal warranty claim message API consolidation');

  has(customerAttachmentsApi, [
    'customer_portal_warranty_claim_attachments_read',
    'service_upload_reviews',
    'approved',
    'visible_to_customer',
    'has_file_access'
  ], 'Customer Portal warranty claim attachment API consolidation');

  has(adminReviewApi, ['warranty_claim_decision', 'warranty_claim_next_action', 'service_operations_warranty_claim_review'], 'Admin review API consolidation');
  has(adminRoutingApi, ['warranty_claim_routing_status', 'warranty_claim_routed_job_id', 'warranty_claim_routed_quotation_id'], 'Admin routing API consolidation');
  has(adminMessagesApi, ['service_operations_warranty_claim_message_reply_submit', 'visible_to_customer', 'internal_only'], 'Admin message reply API consolidation');
  has(adminAttachmentsApi, ['service_operations_warranty_claim_attachment_review_submit', 'review_status', 'visible_to_customer'], 'Admin attachment review API consolidation');
  has(adminClosureApi, ['close_warranty_claim_tx', 'service_operations_warranty_claim_closure_submit', 'completed', 'closed', 'cancelled', 'reopened'], 'Admin closure API consolidation');

  has(customerDetail, [
    'FinalSummaryCard',
    'TimelinePanel',
    'MessageThreadPanel',
    'CustomerPortalWarrantyClaimAttachmentsPanel',
    'Warranty Claim Read-Only View',
    'This page is read-only',
    'PDF',
    'warranty_claim_closure_status'
  ], 'Customer Portal detail UI consolidation');
  noBrowserStorage(customerDetail, 'Customer Portal detail UI consolidation');
  noCustomerDocumentMutation(customerDetail, 'Customer Portal detail UI consolidation');
  noDownloadPrompt(customerDetail, 'Customer Portal detail UI consolidation');

  has(customerRecords, ['Warranty Claim Tracking', 'View / 查看', '/customer-portal/warranty-claims/${id}'], 'Customer records warranty claim tracking link consolidation');
  has(customerAttachments, ['create_signed_upload_url', 'register_completed_upload', 'Upload Attachment / 上传附件', 'Open / 打开'], 'Customer attachments upload panel consolidation');
  noBrowserStorage(customerAttachments, 'Customer attachments upload panel consolidation');
  noCustomerDocumentMutation(customerAttachments, 'Customer attachments upload panel consolidation');

  has(serviceOpsPage, [
    'ServiceOperationsWarrantyClaimReviewPanel',
    'ServiceOperationsWarrantyClaimRoutingPanel',
    'ServiceOperationsWarrantyClaimMessageReplyPanel',
    'ServiceOperationsWarrantyClaimAttachmentReviewPanel',
    'ServiceOperationsWarrantyClaimClosurePanel'
  ], 'Service Operations Phase D.4 panel consolidation');

  has(messageSql, ['warranty_claim_messages', 'enable row level security', 'customers can read own visible warranty claim messages'], 'Warranty claim messages migration consolidation');
  has(closureSql, ['close_warranty_claim_tx', 'status_transition_logs', 'service_operations_warranty_claim_close_tx'], 'Warranty claim closure RPC consolidation');

  const warrantyClaimApiMatches = allApi.match(/customer_portal_request_type/g) ?? [];
  warn(warrantyClaimApiMatches.length >= 8, 'Expected customer_portal_request_type boundary to appear across D.4 APIs.');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-predeploy-consolidation', failures, warnings };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
