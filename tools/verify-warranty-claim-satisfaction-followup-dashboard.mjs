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
  'app/api/admin/service-operations/warranty-claim-satisfaction/route.ts',
  'components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-claim-satisfaction-confirmation.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.5.1 warranty claim satisfaction follow-up file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/admin/service-operations/warranty-claim-satisfaction/route.ts');
  const panel = read('components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const d5Verifier = read('tools/verify-warranty-claim-satisfaction-confirmation.mjs');
  const pkg = read('package.json');

  has(api, [
    'service_operations_warranty_claim_satisfaction_followup_read',
    'service_operations_warranty_claim_satisfaction_followup_submit',
    'READ_ROLES',
    'WRITE_ROLES',
    'warranty_claim_customer_satisfaction_status',
    'not_satisfied',
    'reopened',
    'warranty_claim_messages',
    'internal_warranty_claim_satisfaction_followup',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'writeAuditLog',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'warranty_claim_next_action',
    'warranty_claim_routing_status'
  ], 'Phase D.5.1 satisfaction follow-up API');
  noSelectStar(api, 'Phase D.5.1 satisfaction follow-up API');
  noOfficialDocumentMutation(api, 'Phase D.5.1 satisfaction follow-up API');

  has(panel, [
    'ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
    '/api/admin/service-operations/warranty-claim-satisfaction',
    'Warranty Claim Satisfaction Follow-up',
    '保修满意度跟进',
    'not_satisfied only',
    'Follow-up Action / 跟进动作',
    'Visible to customer / 客户可见',
    'Customer Reply / 回复客户',
    'Internal Note / 内部备注',
    'Save Follow-up / 保存跟进',
    'Follow-up only updates warranty claim next action, routing status, task state and messages. It does not edit quotations, invoices, warranties or payment records.'
  ], 'Phase D.5.1 satisfaction follow-up panel');
  noBrowserStorage(panel, 'Phase D.5.1 satisfaction follow-up panel');
  noOfficialDocumentMutation(panel, 'Phase D.5.1 satisfaction follow-up panel');
  noDownloadPrompt(panel, 'Phase D.5.1 satisfaction follow-up panel');

  has(page, [
    'ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
    '@/components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
    '<ServiceOperationsWarrantyClaimSatisfactionFollowupPanel />'
  ], 'Service Operations mounts D.5.1 satisfaction follow-up panel');

  has(d5Verifier, [
    'verify-warranty-claim-satisfaction-confirmation.mjs',
    'CustomerPortalWarrantyClaimSatisfactionPanel',
    'confirm_warranty_claim_satisfaction_tx'
  ], 'Phase D.5 satisfaction verifier remains present');

  has(pkg, [
    'verify:warranty-claim-satisfaction-followup-dashboard',
    'verify-warranty-claim-satisfaction-followup-dashboard.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.5.1 follow-up gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-satisfaction-followup-dashboard', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
