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
  'supabase/migrations/202605300004_warranty_claim_completion_closure.sql',
  'app/api/admin/service-operations/warranty-claim-closure/route.ts',
  'components/ServiceOperationsWarrantyClaimClosurePanel.tsx',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts',
  'app/service-operations/page.tsx',
  'tools/verify-internal-warranty-claim-attachment-review.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.10 warranty claim completion closure file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605300004_warranty_claim_completion_closure.sql');
  const api = read('app/api/admin/service-operations/warranty-claim-closure/route.ts');
  const panel = read('components/ServiceOperationsWarrantyClaimClosurePanel.tsx');
  const customerDetailApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts');
  const page = read('app/service-operations/page.tsx');
  const attachmentVerifier = read('tools/verify-internal-warranty-claim-attachment-review.mjs');
  const pkg = read('package.json');

  has(sql, [
    'Warranty Claim Completion & Closure',
    'warranty_claim_closure_status',
    'warranty_claim_completed_at',
    'warranty_claim_closed_at',
    'warranty_claim_closed_by',
    'warranty_claim_completion_summary',
    'warranty_claim_closure_notes',
    'close_warranty_claim_tx',
    'security definer',
    "p_actor_role not in ('super_admin','operations_admin','support')",
    "customer_portal_request_type, '') <> 'warranty_repair'",
    'status_transition_logs',
    'service_operations_warranty_claim_close_tx',
    'grant execute on function public.close_warranty_claim_tx'
  ], 'Phase D.4.10 completion closure migration and RPC');

  has(api, [
    'service_operations_warranty_claim_closure_read',
    'service_operations_warranty_claim_closure_submit',
    'close_warranty_claim_tx',
    'READ_ROLES',
    'WRITE_ROLES',
    'completed',
    'closed',
    'cancelled',
    'reopened',
    'warranty_claim_closure_status',
    'warranty_claim_completed_at',
    'warranty_claim_closed_at',
    'warranty_claim_completion_summary',
    'warranty_claim_closure_notes',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'writeAuditLog'
  ], 'Phase D.4.10 completion closure API');
  noSelectStar(api, 'Phase D.4.10 completion closure API');
  noCustomerDocumentMutation(api, 'Phase D.4.10 completion closure API');

  has(panel, [
    'ServiceOperationsWarrantyClaimClosurePanel',
    '/api/admin/service-operations/warranty-claim-closure',
    'Warranty Claim Completion & Closure',
    '保修申请完成与关闭',
    'completed — warranty repair completed',
    'closed — claim closed',
    'cancelled — claim cancelled',
    'reopened — claim reopened',
    'Completion Summary / 完成说明',
    'Closure Notes / 关闭备注',
    'Save Closure / 保存关闭状态',
    'Closure only updates warranty claim status and timeline. It does not edit quotations, invoices, warranties or payment records.'
  ], 'Phase D.4.10 completion closure panel');
  noBrowserStorage(panel, 'Phase D.4.10 completion closure panel');

  has(customerDetailApi, [
    'warranty_claim_closure_status',
    'warranty_claim_completed_at',
    'warranty_claim_closed_at',
    'warranty_claim_completion_summary',
    'warranty_claim_closure_notes',
    'warranty_claim_completed',
    'Warranty claim completed',
    'warranty_claim_closed',
    'Warranty claim closed',
    'closure_status: serviceRequest.warranty_claim_closure_status'
  ], 'Customer Portal warranty claim detail exposes closure state and timeline');
  noSelectStar(customerDetailApi, 'Customer Portal warranty claim detail closure API');
  noCustomerDocumentMutation(customerDetailApi, 'Customer Portal warranty claim detail closure API');

  has(page, [
    'ServiceOperationsWarrantyClaimClosurePanel',
    '@/components/ServiceOperationsWarrantyClaimClosurePanel',
    '<ServiceOperationsWarrantyClaimClosurePanel />'
  ], 'Service Operations page mounts D.4.10 closure panel');

  has(attachmentVerifier, [
    'verify-internal-warranty-claim-attachment-review.mjs',
    'ServiceOperationsWarrantyClaimAttachmentReviewPanel'
  ], 'Phase D.4.9 attachment review verifier remains present');

  has(pkg, [
    'verify:warranty-claim-completion-closure',
    'verify-warranty-claim-completion-closure.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.10 completion closure gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-completion-closure', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
