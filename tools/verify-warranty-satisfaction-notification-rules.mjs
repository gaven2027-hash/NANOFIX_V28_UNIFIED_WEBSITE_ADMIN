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
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/satisfaction/route.ts',
  'app/api/admin/service-operations/warranty-satisfaction-notifications/route.ts',
  'components/ServiceOperationsWarrantySatisfactionNotificationRulesPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-satisfaction-analytics-alerts.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.5.3 satisfaction notification file: ${file}`);

if (requiredFiles.every(exists)) {
  const customerApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/satisfaction/route.ts');
  const rulesApi = read('app/api/admin/service-operations/warranty-satisfaction-notifications/route.ts');
  const panel = read('components/ServiceOperationsWarrantySatisfactionNotificationRulesPanel.tsx');
  const page = read('app/service-operations/page.tsx');
  const d52Verifier = read('tools/verify-warranty-satisfaction-analytics-alerts.mjs');
  const pkg = read('package.json');

  has(customerApi, [
    'WC-SAT-NOTIFY-001',
    'WC-SAT-NOTIFY-002',
    'WC-SAT-NOTIFY-003',
    'WC-SAT-NOTIFY-004',
    'WC-SAT-NOTIFY-005',
    'customer_portal_warranty_claim_satisfaction_customer_receipt',
    'customer_portal_warranty_claim_low_rating_alert',
    'customer_portal_warranty_claim_reopened_alert',
    'notificationRows',
    'notification_rules'
  ], 'Phase D.5.3 customer satisfaction API notification rules');
  noSelectStar(customerApi, 'Phase D.5.3 customer satisfaction API');
  noOfficialDocumentMutation(customerApi, 'Phase D.5.3 customer satisfaction API');

  has(rulesApi, [
    'service_operations_warranty_satisfaction_notification_rules_read',
    'service_operations_warranty_satisfaction_notification_rules_preview',
    'service_operations_warranty_satisfaction_notification_rules_apply',
    'WC-SAT-NOTIFY-001',
    'WC-SAT-NOTIFY-002',
    'WC-SAT-NOTIFY-003',
    'WC-SAT-NOTIFY-004',
    'WC-SAT-NOTIFY-005',
    'WC-SAT-NOTIFY-006',
    'warranty_satisfaction_notification_rules',
    'notification_outbox',
    'dry_run',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'writeAuditLog'
  ], 'Phase D.5.3 notification rules API');
  noSelectStar(rulesApi, 'Phase D.5.3 notification rules API');
  noOfficialDocumentMutation(rulesApi, 'Phase D.5.3 notification rules API');

  has(panel, [
    'ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
    '/api/admin/service-operations/warranty-satisfaction-notifications',
    'Warranty Satisfaction Notification Rules',
    '保修满意度通知规则',
    'Preview Rules / 预览规则',
    'Apply Rules / 执行规则',
    'Rules only create queued notices. They do not edit quotations, invoices, warranties or payments.'
  ], 'Phase D.5.3 notification rules panel');
  noBrowserStorage(panel, 'Phase D.5.3 notification rules panel');
  noOfficialDocumentMutation(panel, 'Phase D.5.3 notification rules panel');
  noDownloadPrompt(panel, 'Phase D.5.3 notification rules panel');

  has(page, [
    'ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
    '@/components/ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
    '<ServiceOperationsWarrantySatisfactionNotificationRulesPanel />'
  ], 'Service Operations mounts Phase D.5.3 notification rules panel');

  has(d52Verifier, [
    'verify-warranty-satisfaction-analytics-alerts.mjs',
    'DashboardWarrantySatisfactionAlerts',
    'WC-SAT-RED-001'
  ], 'Phase D.5.2 analytics verifier remains present');

  has(pkg, [
    'verify:warranty-satisfaction-notification-rules',
    'verify-warranty-satisfaction-notification-rules.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.5.3 notification rules gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-satisfaction-notification-rules', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
