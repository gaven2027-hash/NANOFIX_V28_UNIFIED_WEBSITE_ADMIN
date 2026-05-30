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
  'app/api/admin/dashboard/warranty-satisfaction-alerts/route.ts',
  'components/DashboardWarrantySatisfactionAlerts.tsx',
  'app/dashboard/page.tsx',
  'tools/verify-warranty-claim-satisfaction-followup-dashboard.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.5.2 warranty satisfaction analytics alerts file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/admin/dashboard/warranty-satisfaction-alerts/route.ts');
  const panel = read('components/DashboardWarrantySatisfactionAlerts.tsx');
  const page = read('app/dashboard/page.tsx');
  const d51Verifier = read('tools/verify-warranty-claim-satisfaction-followup-dashboard.mjs');
  const pkg = read('package.json');

  has(api, [
    'dashboard_warranty_satisfaction_alerts_read',
    'READ_ROLES',
    'warranty_claim_customer_satisfaction_status',
    'not_satisfied',
    'reopened',
    'warranty_claim_customer_satisfaction_rating',
    'low_rating_total',
    'red_alert_total',
    'amber_alert_total',
    'WC-SAT-RED-001',
    'WC-SAT-RED-002',
    'WC-SAT-AMB-003',
    'WC-SAT-RED-004',
    'WC-SAT-AMB-005',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'writeAuditLog'
  ], 'Phase D.5.2 warranty satisfaction analytics alerts API');
  noSelectStar(api, 'Phase D.5.2 warranty satisfaction analytics alerts API');
  noOfficialDocumentMutation(api, 'Phase D.5.2 warranty satisfaction analytics alerts API');

  has(panel, [
    'DashboardWarrantySatisfactionAlerts',
    '/api/admin/dashboard/warranty-satisfaction-alerts',
    'Warranty Satisfaction Alerts / 保修满意度预警',
    'Phase D.5.2 / Analytics & Alerts',
    'Not Satisfied / 不满意',
    'Reopened / 重新打开',
    'Low Rating / 低评分',
    'Open follow-up / 打开跟进',
    '/service-operations#warranty-claim-satisfaction-followup'
  ], 'Phase D.5.2 dashboard satisfaction alerts panel');
  noBrowserStorage(panel, 'Phase D.5.2 dashboard satisfaction alerts panel');
  noOfficialDocumentMutation(panel, 'Phase D.5.2 dashboard satisfaction alerts panel');
  noDownloadPrompt(panel, 'Phase D.5.2 dashboard satisfaction alerts panel');

  has(page, [
    'DashboardWarrantySatisfactionAlerts',
    '@/components/DashboardWarrantySatisfactionAlerts',
    '<DashboardWarrantySatisfactionAlerts />'
  ], 'Dashboard page mounts Phase D.5.2 alerts panel');

  has(d51Verifier, [
    'verify-warranty-claim-satisfaction-followup-dashboard.mjs',
    'ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
    'service_operations_warranty_claim_satisfaction_followup_submit'
  ], 'Phase D.5.1 follow-up verifier remains present');

  has(pkg, [
    'verify:warranty-satisfaction-analytics-alerts',
    'verify-warranty-satisfaction-analytics-alerts.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.5.2 analytics alerts gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-satisfaction-analytics-alerts', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
