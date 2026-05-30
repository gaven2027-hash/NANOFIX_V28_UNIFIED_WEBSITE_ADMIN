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

const requiredFiles = [
  'supabase/migrations/202605300001_warranty_claim_admin_review.sql',
  'app/api/admin/service-operations/warranty-claims/route.ts',
  'components/ServiceOperationsWarrantyClaimReviewPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-claim-workflow.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.1 warranty claim admin review file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605300001_warranty_claim_admin_review.sql');
  const api = read('app/api/admin/service-operations/warranty-claims/route.ts');
  const panel = read('components/ServiceOperationsWarrantyClaimReviewPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const workflowVerifier = read('tools/verify-warranty-claim-workflow.mjs');
  const pkg = read('package.json');

  has(sql, [
    'Warranty Claim Admin Review Decision',
    'alter table public.service_requests',
    'warranty_claim_decision',
    'in_warranty',
    'out_of_warranty',
    'needs_new_quote',
    'rejected',
    'converted_to_job',
    'warranty_claim_next_action',
    'schedule_repair_under_warranty',
    'prepare_new_quotation',
    'review_warranty_claim_tx',
    'security definer',
    "p_actor_role not in ('super_admin','operations_admin','support')",
    "customer_portal_request_type, '') <> 'warranty_repair'",
    'status_transition_logs',
    'audit_logs',
    'service_operations_warranty_claim_decision_tx',
    'grant execute on function public.review_warranty_claim_tx'
  ], 'Phase D.4.1 warranty claim review migration and transactional RPC');

  has(api, [
    'READ_ROLES',
    'WRITE_ROLES',
    'DECISIONS',
    '/service-operations/warranty-claims',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'warranty_claim_decision',
    'warranty_claim_next_action',
    'review_warranty_claim_tx',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'service_operations_warranty_claims_read',
    'service_operations_warranty_claim_decision_submit',
    'writeAuditLog'
  ], 'Phase D.4.1 warranty claim admin review API');
  noSelectStar(api, 'Phase D.4.1 warranty claim admin review API');
  noCustomerDocumentMutation(api, 'Phase D.4.1 warranty claim admin review API');

  has(panel, [
    'ServiceOperationsWarrantyClaimReviewPanel',
    '/api/admin/service-operations/warranty-claims?limit=50',
    '/api/admin/service-operations/warranty-claims',
    'Warranty Claim Admin Review Decision',
    'Warranty Claim Queue / 保修申请队列',
    'in_warranty',
    'out_of_warranty',
    'needs_new_quote',
    'converted_to_job',
    'rejected',
    'Save Warranty Claim Decision / 保存保修审核决定',
    'does not let customers edit warranties, invoices, quotations or payment records'
  ], 'Phase D.4.1 warranty claim admin review panel');
  noBrowserStorage(panel, 'Phase D.4.1 warranty claim admin review panel');

  has(page, [
    'ServiceOperationsWarrantyClaimReviewPanel',
    '@/components/ServiceOperationsWarrantyClaimReviewPanel',
    '<ServiceOperationsWarrantyClaimReviewPanel />'
  ], 'Service Operations page mounts D.4.1 warranty claim review panel');

  has(workflowVerifier, [
    'warranty_repair',
    'related_warranty_id',
    'customer_portal_service_request_submit_to_unified_queue'
  ], 'Phase D.4 base workflow verifier remains present');

  has(pkg, [
    'verify:warranty-claim-admin-review',
    'verify-warranty-claim-admin-review.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.1 warranty claim admin review gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-admin-review', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
