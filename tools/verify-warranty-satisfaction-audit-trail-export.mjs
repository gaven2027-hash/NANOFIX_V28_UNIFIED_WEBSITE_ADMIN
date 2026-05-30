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
  'app/api/admin/service-operations/warranty-satisfaction-audit-trail/route.ts',
  'components/ServiceOperationsWarrantySatisfactionAuditTrailPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-satisfaction-notification-rules.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.5.4 satisfaction audit trail file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/admin/service-operations/warranty-satisfaction-audit-trail/route.ts');
  const panel = read('components/ServiceOperationsWarrantySatisfactionAuditTrailPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const d53Verifier = read('tools/verify-warranty-satisfaction-notification-rules.mjs');
  const pkg = read('package.json');

  has(api, [
    'service_operations_warranty_satisfaction_audit_trail_read',
    'service_operations_warranty_satisfaction_audit_trail_export_csv',
    'text/csv; charset=utf-8',
    'content-disposition',
    'warranty_claim_messages',
    'notification_outbox',
    'status_transition_logs',
    'audit_logs',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'makeCsv',
    'writeAuditLog'
  ], 'Phase D.5.4 satisfaction audit trail export API');
  noSelectStar(api, 'Phase D.5.4 audit trail export API');
  noOfficialDocumentMutation(api, 'Phase D.5.4 audit trail export API');

  has(panel, [
    'ServiceOperationsWarrantySatisfactionAuditTrailPanel',
    '/api/admin/service-operations/warranty-satisfaction-audit-trail',
    'Warranty Satisfaction Audit Trail',
    '保修满意度审计时间线',
    'CSV Export / CSV 导出',
    'Audit export is read-only. It does not edit quotations, invoices, warranties or payments.'
  ], 'Phase D.5.4 audit trail panel');
  noBrowserStorage(panel, 'Phase D.5.4 audit trail panel');
  noOfficialDocumentMutation(panel, 'Phase D.5.4 audit trail panel');
  noDownloadPrompt(panel, 'Phase D.5.4 audit trail panel');

  has(page, [
    'ServiceOperationsWarrantySatisfactionAuditTrailPanel',
    '@/components/ServiceOperationsWarrantySatisfactionAuditTrailPanel',
    '<ServiceOperationsWarrantySatisfactionAuditTrailPanel />'
  ], 'Service Operations mounts Phase D.5.4 audit panel');

  has(d53Verifier, [
    'verify-warranty-satisfaction-notification-rules.mjs',
    'ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
    'WC-SAT-NOTIFY-006'
  ], 'Phase D.5.3 notification verifier remains present');

  has(pkg, [
    'verify:warranty-satisfaction-audit-trail-export',
    'verify-warranty-satisfaction-audit-trail-export.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.5.4 audit trail gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-satisfaction-audit-trail-export', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
