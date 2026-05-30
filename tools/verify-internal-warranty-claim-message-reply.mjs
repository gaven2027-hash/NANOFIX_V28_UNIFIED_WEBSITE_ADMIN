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
  'app/api/admin/service-operations/warranty-claim-messages/route.ts',
  'components/ServiceOperationsWarrantyClaimMessageReplyPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-customer-portal-warranty-claim-message-thread.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.7 internal warranty claim reply file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/admin/service-operations/warranty-claim-messages/route.ts');
  const panel = read('components/ServiceOperationsWarrantyClaimMessageReplyPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const customerVerifier = read('tools/verify-customer-portal-warranty-claim-message-thread.mjs');
  const pkg = read('package.json');

  has(api, [
    'service_operations_warranty_claim_messages_read',
    'service_operations_warranty_claim_message_reply_submit',
    'READ_ROLES',
    'WRITE_ROLES',
    'warranty_claim_messages',
    'sender_type',
    'internal',
    'visible_to_customer',
    'internal_only',
    'internal_admin_warranty_claim_reply',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'writeAuditLog',
    "recipient_customer_id: claim.customer_id",
    "request_origin', 'customer_portal'",
    "customer_portal_request_type', 'warranty_repair'"
  ], 'Phase D.4.7 internal warranty claim reply API');
  noSelectStar(api, 'Phase D.4.7 internal warranty claim reply API');
  noCustomerDocumentMutation(api, 'Phase D.4.7 internal warranty claim reply API');

  has(panel, [
    'ServiceOperationsWarrantyClaimMessageReplyPanel',
    '/api/admin/service-operations/warranty-claim-messages',
    'Warranty Claim Message Reply',
    '保修申请后台回复',
    'Visible to customer / 客户可见',
    'Send Reply / 发送回复',
    'Thread / 留言线程',
    'Customer visible:',
    'Internal only:',
    'Replies only add messages. They do not edit quotations, invoices, warranties or payment records.'
  ], 'Phase D.4.7 internal warranty claim reply panel');
  noBrowserStorage(panel, 'Phase D.4.7 internal warranty claim reply panel');

  has(page, [
    'ServiceOperationsWarrantyClaimMessageReplyPanel',
    '@/components/ServiceOperationsWarrantyClaimMessageReplyPanel',
    '<ServiceOperationsWarrantyClaimMessageReplyPanel />'
  ], 'Service Operations page mounts D.4.7 reply panel');

  has(customerVerifier, [
    'verify-customer-portal-warranty-claim-message-thread.mjs',
    'MessageThreadPanel',
    'warranty_claim_messages'
  ], 'D.4.6 customer message thread verifier remains present');

  has(pkg, [
    'verify:internal-warranty-claim-message-reply',
    'verify-internal-warranty-claim-message-reply.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.7 internal reply gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-internal-warranty-claim-message-reply', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
