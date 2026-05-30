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
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not let customers mutate official quotation, invoice, warranty or payment records.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const requiredFiles = [
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/attachments/route.ts',
  'components/CustomerPortalWarrantyClaimAttachmentsPanel.tsx',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'app/api/customer-portal/storage-upload-url/route.ts',
  'tools/verify-customer-portal-warranty-claim-message-thread.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.8 warranty claim attachments file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/attachments/route.ts');
  const panel = read('components/CustomerPortalWarrantyClaimAttachmentsPanel.tsx');
  const detail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const uploadApi = read('app/api/customer-portal/storage-upload-url/route.ts');
  const messageVerifier = read('tools/verify-customer-portal-warranty-claim-message-thread.mjs');
  const pkg = read('package.json');

  has(api, [
    'customer_portal_warranty_claim_attachments_read',
    'loadOwnedWarrantyClaim',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'service_upload_reviews',
    'visible_to_customer',
    'review_status',
    'approved',
    'createSignedUrl',
    'has_file_access',
    'file_url',
    'writeAuditLog'
  ], 'Phase D.4.8 customer warranty claim attachments API');
  noSelectStar(api, 'Phase D.4.8 customer warranty claim attachments API');
  noCustomerDocumentMutation(api, 'Phase D.4.8 customer warranty claim attachments API');

  has(panel, [
    'CustomerPortalWarrantyClaimAttachmentsPanel',
    '/api/customer-portal/warranty-claims/${serviceRequestId}/attachments',
    '/api/customer-portal/storage-upload-url',
    'create_signed_upload_url',
    'register_completed_upload',
    'Warranty Claim Attachments',
    '保修申请补充附件',
    'Upload Attachment / 上传附件',
    'Open / 打开',
    'Attachments only add evidence to this warranty claim. They do not edit quotations, invoices, warranties or payment records.'
  ], 'Phase D.4.8 customer warranty claim attachments panel');
  noBrowserStorage(panel, 'Phase D.4.8 customer warranty claim attachments panel');
  noDownloadPrompt(panel, 'Phase D.4.8 customer warranty claim attachments panel');

  has(detail, [
    'CustomerPortalWarrantyClaimAttachmentsPanel',
    '@/components/CustomerPortalWarrantyClaimAttachmentsPanel',
    '<CustomerPortalWarrantyClaimAttachmentsPanel serviceRequestId={serviceRequestId} />'
  ], 'Phase D.4.8 detail page mounts attachments panel');

  has(uploadApi, [
    'assertCustomerOwnsServiceRequest',
    'service_upload_reviews',
    'review_status: \'pending_review\'',
    'visible_to_customer: false',
    'customer_portal_signed_upload_url_create',
    'customer_portal_completed_upload_register',
    'internal_inbox_messages',
    'unified_tasks',
    'task_events'
  ], 'Existing customer portal upload API reused by D.4.8');
  noSelectStar(uploadApi, 'Existing customer portal upload API reused by D.4.8');
  noCustomerDocumentMutation(uploadApi, 'Existing customer portal upload API reused by D.4.8');

  has(messageVerifier, [
    'verify-customer-portal-warranty-claim-message-thread.mjs',
    'MessageThreadPanel',
    'warranty_claim_messages'
  ], 'Phase D.4.6 message thread verifier remains present');

  has(pkg, [
    'verify:customer-warranty-claim-attachments',
    'verify-customer-portal-warranty-claim-attachments.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.8 attachments gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-warranty-claim-attachments', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
