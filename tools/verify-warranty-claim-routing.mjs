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
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|delete)/.test(content), `${label} must not let customers mutate official quotation, invoice, warranty or payment records.`);

const requiredFiles = [
  'supabase/migrations/202605300002_warranty_claim_job_quotation_routing.sql',
  'app/api/admin/service-operations/warranty-claim-routing/route.ts',
  'components/ServiceOperationsWarrantyClaimRoutingPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-claim-admin-review.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.2 warranty claim routing file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605300002_warranty_claim_job_quotation_routing.sql');
  const api = read('app/api/admin/service-operations/warranty-claim-routing/route.ts');
  const panel = read('components/ServiceOperationsWarrantyClaimRoutingPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const reviewVerifier = read('tools/verify-warranty-claim-admin-review.mjs');
  const pkg = read('package.json');

  has(sql, [
    'Warranty Claim → Job / Quotation Routing',
    'alter table public.service_requests',
    'warranty_claim_routing_status',
    'warranty_claim_routed_job_id',
    'warranty_claim_routed_quotation_id',
    'route_warranty_claim_tx',
    'security definer',
    "p_actor_role not in ('super_admin','operations_admin','support')",
    "customer_portal_request_type, '') <> 'warranty_repair'",
    'Warranty claim must be reviewed before routing',
    'create_warranty_job',
    'create_payable_quote',
    'close_rejected_claim',
    'continue_existing_flow',
    'insert into public.jobs',
    'insert into public.quotations',
    'insert into public.quotation_versions',
    'status_transition_logs',
    'audit_logs',
    'service_operations_warranty_claim_routing_tx',
    'grant execute on function public.route_warranty_claim_tx'
  ], 'Phase D.4.2 warranty claim routing migration and transactional RPC');

  has(api, [
    'ROUTE_ACTIONS',
    'create_warranty_job',
    'create_payable_quote',
    'close_rejected_claim',
    'continue_existing_flow',
    'route_warranty_claim_tx',
    'warranty_claim_routing_status',
    'warranty_claim_routed_job_id',
    'warranty_claim_routed_quotation_id',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'service_operations_warranty_claim_routing_read',
    'service_operations_warranty_claim_route_submit',
    'writeAuditLog'
  ], 'Phase D.4.2 warranty claim routing API');
  noSelectStar(api, 'Phase D.4.2 warranty claim routing API');
  noCustomerDocumentMutation(api, 'Phase D.4.2 warranty claim routing API');

  has(panel, [
    'ServiceOperationsWarrantyClaimRoutingPanel',
    '/api/admin/service-operations/warranty-claim-routing?limit=50',
    '/api/admin/service-operations/warranty-claim-routing',
    'Warranty Claim → Job / Quotation Routing',
    'Reviewed Warranty Claims / 已审核保修申请',
    'create_warranty_job',
    'create_payable_quote',
    'continue_existing_flow',
    'close_rejected_claim',
    'Route Warranty Claim / 路由保修申请',
    'Draft quotations must still be revised and approved from Internal Admin before customer acceptance'
  ], 'Phase D.4.2 warranty claim routing panel');
  noBrowserStorage(panel, 'Phase D.4.2 warranty claim routing panel');

  has(page, [
    'ServiceOperationsWarrantyClaimRoutingPanel',
    '@/components/ServiceOperationsWarrantyClaimRoutingPanel',
    '<ServiceOperationsWarrantyClaimRoutingPanel />'
  ], 'Service Operations page mounts D.4.2 warranty claim routing panel');

  has(reviewVerifier, [
    'verify-warranty-claim-admin-review.mjs',
    'review_warranty_claim_tx',
    'warranty_claim_decision'
  ], 'Phase D.4.1 review verifier remains present');

  has(pkg, [
    'verify:warranty-claim-routing',
    'verify-warranty-claim-routing.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.2 warranty claim routing gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-routing', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
