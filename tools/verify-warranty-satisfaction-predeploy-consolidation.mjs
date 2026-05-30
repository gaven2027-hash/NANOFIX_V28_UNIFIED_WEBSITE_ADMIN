import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noSelectStar = (content, label) => assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select star.`);
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
const noOfficialDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not mutate official quotation, invoice, warranty or payment records.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const phaseFiles = [
  'supabase/migrations/202605300005_warranty_claim_satisfaction.sql',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/satisfaction/route.ts',
  'components/CustomerPortalWarrantyClaimSatisfactionPanel.tsx',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts',
  'app/api/admin/service-operations/warranty-claim-satisfaction/route.ts',
  'components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel.tsx',
  'app/api/admin/dashboard/warranty-satisfaction-alerts/route.ts',
  'components/DashboardWarrantySatisfactionAlerts.tsx',
  'app/dashboard/page.tsx',
  'app/api/admin/service-operations/warranty-satisfaction-notifications/route.ts',
  'components/ServiceOperationsWarrantySatisfactionNotificationRulesPanel.tsx',
  'app/api/admin/service-operations/warranty-satisfaction-audit-trail/route.ts',
  'components/ServiceOperationsWarrantySatisfactionAuditTrailPanel.tsx',
  'app/service-operations/page.tsx',
  'tools/verify-warranty-claim-satisfaction-confirmation.mjs',
  'tools/verify-warranty-claim-satisfaction-followup-dashboard.mjs',
  'tools/verify-warranty-satisfaction-analytics-alerts.mjs',
  'tools/verify-warranty-satisfaction-notification-rules.mjs',
  'tools/verify-warranty-satisfaction-audit-trail-export.mjs',
  'package.json'
];

for (const file of phaseFiles) assert(exists(file), `Missing Phase D.5 consolidation file: ${file}`);

if (phaseFiles.every(exists)) {
  const pkg = read('package.json');
  const migration = read('supabase/migrations/202605300005_warranty_claim_satisfaction.sql');
  const customerSatisfactionApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/satisfaction/route.ts');
  const customerSatisfactionPanel = read('components/CustomerPortalWarrantyClaimSatisfactionPanel.tsx');
  const customerDetail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const customerDetailApi = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts');
  const followupApi = read('app/api/admin/service-operations/warranty-claim-satisfaction/route.ts');
  const followupPanel = read('components/ServiceOperationsWarrantyClaimSatisfactionFollowupPanel.tsx');
  const alertsApi = read('app/api/admin/dashboard/warranty-satisfaction-alerts/route.ts');
  const alertsPanel = read('components/DashboardWarrantySatisfactionAlerts.tsx');
  const dashboardPage = read('app/dashboard/page.tsx');
  const notificationApi = read('app/api/admin/service-operations/warranty-satisfaction-notifications/route.ts');
  const notificationPanel = read('components/ServiceOperationsWarrantySatisfactionNotificationRulesPanel.tsx');
  const auditApi = read('app/api/admin/service-operations/warranty-satisfaction-audit-trail/route.ts');
  const auditPanel = read('components/ServiceOperationsWarrantySatisfactionAuditTrailPanel.tsx');
  const serviceOpsPage = read('app/service-operations/page.tsx');

  const d5Scripts = [
    'verify:warranty-claim-satisfaction-confirmation',
    'verify:warranty-claim-satisfaction-followup-dashboard',
    'verify:warranty-satisfaction-analytics-alerts',
    'verify:warranty-satisfaction-notification-rules',
    'verify:warranty-satisfaction-audit-trail-export',
    'verify:warranty-satisfaction-predeploy-consolidation'
  ];
  for (const script of d5Scripts) has(pkg, [script], 'package Phase D.5 verifier scripts');
  const predeploy = pkg.match(/"validate:predeploy"\s*:\s*"([^"]+)"/)?.[1] ?? '';
  for (const script of d5Scripts) assert(predeploy.includes(`npm run ${script}`), `validate:predeploy missing ${script}`);
  for (let i = 0; i < d5Scripts.length - 1; i += 1) {
    assert(predeploy.indexOf(`npm run ${d5Scripts[i]}`) < predeploy.indexOf(`npm run ${d5Scripts[i + 1]}`), `validate:predeploy order broken between ${d5Scripts[i]} and ${d5Scripts[i + 1]}`);
  }

  has(migration, [
    'Customer Portal Warranty Claim Acceptance / Satisfaction Confirmation',
    'warranty_claim_customer_satisfaction_status',
    'warranty_claim_customer_satisfaction_rating',
    'warranty_claim_customer_satisfaction_notes',
    'warranty_claim_customer_confirmed_at',
    'warranty_claim_customer_reopened_at',
    'warranty_claim_customer_reopen_reason',
    'confirm_warranty_claim_satisfaction_tx',
    "customer_portal_request_type, '') <> 'warranty_repair'",
    "coalesce(v_request.warranty_claim_closure_status, 'open') not in ('completed','closed')",
    'status_transition_logs',
    'customer_portal_warranty_claim_satisfaction_confirm_tx'
  ], 'D.5 migration and RPC');

  has(customerSatisfactionApi, [
    'customer_portal_warranty_claim_satisfaction_submit',
    'confirm_warranty_claim_satisfaction_tx',
    "requireActorApi(request, ['customer'])",
    'unified_tasks',
    'warranty_claim_messages',
    'notificationRows',
    'WC-SAT-NOTIFY-001',
    'WC-SAT-NOTIFY-005'
  ], 'D.5 customer satisfaction API');
  noSelectStar(customerSatisfactionApi, 'D.5 customer satisfaction API');
  noOfficialDocumentMutation(customerSatisfactionApi, 'D.5 customer satisfaction API');

  has(customerSatisfactionPanel, [
    'CustomerPortalWarrantyClaimSatisfactionPanel',
    'Warranty Claim Satisfaction Confirmation',
    'Satisfied — accept the completed warranty repair',
    'Not satisfied — request follow-up',
    'This confirmation only records your satisfaction feedback. It does not edit quotations, invoices, warranties or payment records.'
  ], 'D.5 customer satisfaction panel');
  noBrowserStorage(customerSatisfactionPanel, 'D.5 customer satisfaction panel');
  noOfficialDocumentMutation(customerSatisfactionPanel, 'D.5 customer satisfaction panel');

  has(customerDetail, [
    'CustomerPortalWarrantyClaimSatisfactionPanel',
    'warranty_claim_customer_satisfaction_status',
    'Satisfaction / 满意确认'
  ], 'D.5 customer detail UI integration');
  noBrowserStorage(customerDetail, 'D.5 customer detail UI integration');
  noDownloadPrompt(customerDetail, 'D.5 customer detail UI integration');

  has(customerDetailApi, [
    'warranty_claim_customer_satisfaction_status',
    'warranty_claim_satisfaction_confirmed',
    'warranty_claim_reopened_by_customer',
    'satisfaction_status: serviceRequest.warranty_claim_customer_satisfaction_status'
  ], 'D.5 customer detail API integration');
  noSelectStar(customerDetailApi, 'D.5 customer detail API integration');

  has(followupApi, [
    'service_operations_warranty_claim_satisfaction_followup_submit',
    'not_satisfied',
    'reopened',
    'warranty_claim_messages',
    'unified_tasks',
    'notification_outbox'
  ], 'D.5.1 follow-up API');
  noSelectStar(followupApi, 'D.5.1 follow-up API');
  noOfficialDocumentMutation(followupApi, 'D.5.1 follow-up API');

  has(followupPanel, [
    'ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
    'Warranty Claim Satisfaction Follow-up',
    'not_satisfied only',
    'Save Follow-up / 保存跟进'
  ], 'D.5.1 follow-up panel');
  noBrowserStorage(followupPanel, 'D.5.1 follow-up panel');

  has(alertsApi, [
    'dashboard_warranty_satisfaction_alerts_read',
    'WC-SAT-RED-001',
    'WC-SAT-AMB-003',
    'red_alert_total',
    'amber_alert_total'
  ], 'D.5.2 analytics API');
  noSelectStar(alertsApi, 'D.5.2 analytics API');
  noOfficialDocumentMutation(alertsApi, 'D.5.2 analytics API');

  has(alertsPanel, [
    'DashboardWarrantySatisfactionAlerts',
    'Warranty Satisfaction Alerts / 保修满意度预警',
    '/service-operations#warranty-claim-satisfaction-followup'
  ], 'D.5.2 analytics panel');
  noBrowserStorage(alertsPanel, 'D.5.2 analytics panel');
  has(dashboardPage, ['DashboardWarrantySatisfactionAlerts', '<DashboardWarrantySatisfactionAlerts />'], 'Dashboard mounts D.5.2 panel');

  has(notificationApi, [
    'service_operations_warranty_satisfaction_notification_rules_apply',
    'WC-SAT-NOTIFY-001',
    'WC-SAT-NOTIFY-006',
    'notification_outbox',
    'dry_run'
  ], 'D.5.3 notification rules API');
  noSelectStar(notificationApi, 'D.5.3 notification rules API');
  noOfficialDocumentMutation(notificationApi, 'D.5.3 notification rules API');

  has(notificationPanel, [
    'ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
    'Warranty Satisfaction Notification Rules',
    'Preview Rules / 预览规则',
    'Apply Rules / 执行规则'
  ], 'D.5.3 notification rules panel');
  noBrowserStorage(notificationPanel, 'D.5.3 notification rules panel');
  noDownloadPrompt(notificationPanel, 'D.5.3 notification rules panel');

  has(auditApi, [
    'service_operations_warranty_satisfaction_audit_trail_read',
    'service_operations_warranty_satisfaction_audit_trail_export_csv',
    'text/csv; charset=utf-8',
    'warranty_claim_messages',
    'notification_outbox',
    'status_transition_logs',
    'audit_logs'
  ], 'D.5.4 audit export API');
  noSelectStar(auditApi, 'D.5.4 audit export API');
  noOfficialDocumentMutation(auditApi, 'D.5.4 audit export API');

  has(auditPanel, [
    'ServiceOperationsWarrantySatisfactionAuditTrailPanel',
    'Warranty Satisfaction Audit Trail',
    'CSV Export / CSV 导出',
    'Audit export is read-only. It does not edit quotations, invoices, warranties or payments.'
  ], 'D.5.4 audit panel');
  noBrowserStorage(auditPanel, 'D.5.4 audit panel');
  noDownloadPrompt(auditPanel, 'D.5.4 audit panel');

  has(serviceOpsPage, [
    'ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
    'ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
    'ServiceOperationsWarrantySatisfactionAuditTrailPanel'
  ], 'Service Operations mounts D.5 panels');

  const allD5 = [customerSatisfactionApi, customerSatisfactionPanel, customerDetail, customerDetailApi, followupApi, followupPanel, alertsApi, alertsPanel, notificationApi, notificationPanel, auditApi, auditPanel, serviceOpsPage].join('\n');
  noOfficialDocumentMutation(allD5, 'D.5 consolidated implementation');
  warn((allD5.match(/customer_portal_request_type/g) ?? []).length >= 6, 'Expected customer_portal_request_type boundary across D.5 APIs.');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-satisfaction-predeploy-consolidation', failures, warnings };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
