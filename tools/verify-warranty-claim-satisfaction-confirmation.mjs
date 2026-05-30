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
const noOfficialDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not mutate official quotation, invoice, warranty or payment records.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const requiredFiles = [
  'supabase/migrations/202605300005_warranty_claim_satisfaction.sql',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/satisfaction/route.ts',
  'components/CustomerPortalWarrantyClaimSatisfactionPanel.tsx',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts',
  'tools/verify-warranty-claim-predeploy-consolidation.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.5 warranty claim satisfaction file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605300005_warranty_claim_satisfaction.sql');
  const api = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/satisfaction/route.ts');
  const panel = read('components/CustomerPortalWarrantyClaimSatisfactionPanel.tsx');
  const detail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const detailApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts');
  const consolidation = read('tools/verify-warranty-claim-predeploy-consolidation.mjs');
  const pkg = read('package.json');

  has(sql, [
    'Customer Portal Warranty Claim Acceptance / Satisfaction Confirmation',
    'warranty_claim_customer_satisfaction_status',
    'warranty_claim_customer_satisfaction_rating',
    'warranty_claim_customer_satisfaction_notes',
    'warranty_claim_customer_confirmed_at',
    'warranty_claim_customer_reopened_at',
    'warranty_claim_customer_reopen_reason',
    'confirm_warranty_claim_satisfaction_tx',
    "('pending','satisfied','not_satisfied','reopened')",
    "v_status not in ('satisfied','not_satisfied')",
    "customer_portal_request_type, '') <> 'warranty_repair'",
    "coalesce(v_request.warranty_claim_closure_status, 'open') not in ('completed','closed')",
    'status_transition_logs',
    'customer_portal_warranty_claim_satisfaction_confirm_tx'
  ], 'Phase D.5 satisfaction migration and RPC');

  has(api, [
    'customer_portal_warranty_claim_satisfaction_read',
    'customer_portal_warranty_claim_satisfaction_submit',
    'confirm_warranty_claim_satisfaction_tx',
    "requireActorApi(request, ['customer'])",
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'completed',
    'closed',
    'satisfied',
    'not_satisfied',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'warranty_claim_messages',
    'customer_portal_warranty_claim_not_satisfied',
    'writeAuditLog'
  ], 'Phase D.5 customer satisfaction API');
  noSelectStar(api, 'Phase D.5 customer satisfaction API');
  noOfficialDocumentMutation(api, 'Phase D.5 customer satisfaction API');

  has(panel, [
    'CustomerPortalWarrantyClaimSatisfactionPanel',
    '/api/customer-portal/warranty-claims/${serviceRequestId}/satisfaction',
    'Warranty Claim Satisfaction Confirmation',
    '保修维修满意确认',
    'Satisfied — accept the completed warranty repair',
    'Not satisfied — request follow-up',
    'Submit Confirmation / 提交确认',
    'This confirmation only records your satisfaction feedback. It does not edit quotations, invoices, warranties or payment records.'
  ], 'Phase D.5 satisfaction customer panel');
  noBrowserStorage(panel, 'Phase D.5 satisfaction customer panel');
  noOfficialDocumentMutation(panel, 'Phase D.5 satisfaction customer panel');
  noDownloadPrompt(panel, 'Phase D.5 satisfaction customer panel');

  has(detail, [
    'CustomerPortalWarrantyClaimSatisfactionPanel',
    '@/components/CustomerPortalWarrantyClaimSatisfactionPanel',
    '<CustomerPortalWarrantyClaimSatisfactionPanel serviceRequestId={serviceRequestId} />',
    'warranty_claim_customer_satisfaction_status',
    'warranty_claim_customer_satisfaction_rating',
    'warranty_claim_customer_satisfaction_notes',
    'warranty_claim_customer_confirmed_at',
    'warranty_claim_customer_reopened_at',
    'warranty_claim_customer_reopen_reason'
  ], 'Customer Portal warranty detail mounts D.5 satisfaction panel');
  noBrowserStorage(detail, 'Customer Portal warranty detail D.5');
  noOfficialDocumentMutation(detail, 'Customer Portal warranty detail D.5');
  noDownloadPrompt(detail, 'Customer Portal warranty detail D.5');

  has(detailApi, [
    'warranty_claim_customer_satisfaction_status',
    'warranty_claim_customer_satisfaction_rating',
    'warranty_claim_customer_satisfaction_notes',
    'warranty_claim_customer_confirmed_at',
    'warranty_claim_customer_reopened_at',
    'warranty_claim_customer_reopen_reason',
    'warranty_claim_satisfaction_confirmed',
    'Customer satisfaction confirmed',
    'warranty_claim_reopened_by_customer',
    'Customer requested follow-up',
    'satisfaction_status: serviceRequest.warranty_claim_customer_satisfaction_status'
  ], 'Customer Portal detail API exposes D.5 satisfaction state');
  noSelectStar(detailApi, 'Customer Portal detail API D.5');
  noOfficialDocumentMutation(detailApi, 'Customer Portal detail API D.5');

  has(consolidation, [
    'verify-warranty-claim-predeploy-consolidation.mjs',
    'verify:warranty-claim-predeploy-consolidation'
  ], 'D.4.12 consolidation verifier remains present');

  has(pkg, [
    'verify:warranty-claim-satisfaction-confirmation',
    'verify-warranty-claim-satisfaction-confirmation.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.5 satisfaction gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-satisfaction-confirmation', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
