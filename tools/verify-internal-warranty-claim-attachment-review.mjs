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
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not mutate official quotation, invoice, warranty or payment records.`);

const requiredFiles = [
  'app/api/admin/service-operations/warranty-claim-attachments/route.ts',
  'components/ServiceOperationsWarrantyClaimAttachmentReviewPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-customer-portal-warranty-claim-attachments.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.9 warranty claim attachment review file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/admin/service-operations/warranty-claim-attachments/route.ts');
  const panel = read('components/ServiceOperationsWarrantyClaimAttachmentReviewPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const customerVerifier = read('tools/verify-customer-portal-warranty-claim-attachments.mjs');
  const pkg = read('package.json');

  has(api, [
    'service_operations_warranty_claim_attachments_read',
    'service_operations_warranty_claim_attachment_review_submit',
    'READ_ROLES',
    'WRITE_ROLES',
    'service_upload_reviews',
    'request_origin',
    'customer_portal',
    'customer_portal_request_type',
    'warranty_repair',
    'review_status',
    'approved',
    'rejected',
    'needs_more_info',
    'visible_to_customer',
    'customer_visible_at',
    'customer_visible_by',
    'createSignedUrl',
    'reviewer_file_url',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'writeAuditLog'
  ], 'Phase D.4.9 internal warranty claim attachment review API');
  noSelectStar(api, 'Phase D.4.9 internal warranty claim attachment review API');
  noCustomerDocumentMutation(api, 'Phase D.4.9 internal warranty claim attachment review API');

  has(panel, [
    'ServiceOperationsWarrantyClaimAttachmentReviewPanel',
    '/api/admin/service-operations/warranty-claim-attachments',
    'Warranty Claim Attachment Review',
    '保修申请附件审核',
    'Review Action / 审核动作',
    'approved — approve attachment',
    'rejected — reject attachment',
    'needs_more_info — request more information',
    'Visible to customer after approval / 批准后客户可见',
    'Preview / 预览',
    'Pick / 选择',
    'Save Review / 保存审核',
    'This review changes only attachment review status and customer visibility. It does not edit quotations, invoices, warranties or payment records.'
  ], 'Phase D.4.9 internal warranty claim attachment review panel');
  noBrowserStorage(panel, 'Phase D.4.9 internal warranty claim attachment review panel');

  has(page, [
    'ServiceOperationsWarrantyClaimAttachmentReviewPanel',
    '@/components/ServiceOperationsWarrantyClaimAttachmentReviewPanel',
    '<ServiceOperationsWarrantyClaimAttachmentReviewPanel />'
  ], 'Service Operations page mounts D.4.9 attachment review panel');

  has(customerVerifier, [
    'verify-customer-portal-warranty-claim-attachments.mjs',
    'CustomerPortalWarrantyClaimAttachmentsPanel',
    'service_upload_reviews'
  ], 'D.4.8 customer attachments verifier remains present');

  has(pkg, [
    'verify:internal-warranty-claim-attachment-review',
    'verify-internal-warranty-claim-attachment-review.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.9 attachment review gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-internal-warranty-claim-attachment-review', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
