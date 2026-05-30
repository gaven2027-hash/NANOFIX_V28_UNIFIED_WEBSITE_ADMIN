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
  'supabase/migrations/202605300003_warranty_claim_messages.sql',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/messages/route.ts',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'tools/verify-customer-portal-warranty-claim-timeline.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.6 customer warranty claim message thread file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605300003_warranty_claim_messages.sql');
  const api = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/messages/route.ts');
  const detail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const timelineVerifier = read('tools/verify-customer-portal-warranty-claim-timeline.mjs');
  const pkg = read('package.json');

  has(sql, [
    'Customer Portal Warranty Claim Message Thread',
    'create table if not exists public.warranty_claim_messages',
    'message_id uuid primary key default gen_random_uuid()',
    'service_request_id uuid not null references public.service_requests',
    "sender_type text not null check (sender_type in ('customer','internal'))",
    'message_body text not null check',
    'visible_to_customer boolean not null default true',
    'internal_only boolean not null default false',
    'enable row level security',
    'customers can read own visible warranty claim messages',
    'internal roles can read warranty claim messages',
    'internal roles can write warranty claim messages',
    'grant all on public.warranty_claim_messages to service_role'
  ], 'Phase D.4.6 warranty claim messages migration');

  has(api, [
    'customer_portal_warranty_claim_messages_read',
    'customer_portal_warranty_claim_message_submit',
    'customerIdsForProfile',
    'loadOwnedWarrantyClaim',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'warranty_claim_messages',
    'visible_to_customer',
    'internal_inbox_messages',
    'unified_tasks',
    'task_events',
    'notification_outbox',
    'writeAuditLog',
    "requireActorApi(request, ['customer'])",
    'message_body',
    'customer_portal_warranty_claim_message'
  ], 'Phase D.4.6 customer warranty claim messages API');
  noSelectStar(api, 'Phase D.4.6 customer warranty claim messages API');
  noCustomerDocumentMutation(api, 'Phase D.4.6 customer warranty claim messages API');

  has(detail, [
    'MessageThreadPanel',
    'loadWarrantyClaimMessages',
    'submitWarrantyClaimMessage',
    '/api/customer-portal/warranty-claims/${serviceRequestId}/messages',
    'Message Thread',
    '保修申请留言线程',
    'Add Message / 添加留言',
    'Submit Message / 提交留言',
    'This does not edit any quotation, invoice, warranty or payment record',
    '<MessageThreadPanel serviceRequestId={serviceRequestId} />'
  ], 'Phase D.4.6 customer warranty claim message thread UI');
  noBrowserStorage(detail, 'Phase D.4.6 customer warranty claim message thread UI');
  noDownloadPrompt(detail, 'Phase D.4.6 customer warranty claim message thread UI');

  has(timelineVerifier, [
    'verify-customer-portal-warranty-claim-timeline.mjs',
    'customer_timeline',
    'TimelinePanel'
  ], 'Phase D.4.5 timeline verifier remains present');

  has(pkg, [
    'verify:customer-warranty-claim-message-thread',
    'verify-customer-portal-warranty-claim-message-thread.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.6 message thread gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-warranty-claim-message-thread', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
