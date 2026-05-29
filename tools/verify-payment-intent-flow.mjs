import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const assertMarkers = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const assertNoBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
const assertNoSelectStar = (content, label) => assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select("*").`);

const requiredFiles = [
  'supabase/migrations/202605290011_payment_intent_admin_flow.sql',
  'app/api/admin/service-operations/payment-intents/route.ts',
  'app/api/customer-portal/payment-intents/route.ts',
  'components/ServiceOperationsPaymentIntentPanel.tsx',
  'components/CustomerPortalPaymentIntentStatus.tsx',
  'app/service-operations/page.tsx',
  'app/customer-portal/financial/page.tsx'
];

for (const file of requiredFiles) assert(exists(file), `Missing payment intent flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290011_payment_intent_admin_flow.sql');
  const adminApi = read('app/api/admin/service-operations/payment-intents/route.ts');
  const customerApi = read('app/api/customer-portal/payment-intents/route.ts');
  const adminPanel = read('components/ServiceOperationsPaymentIntentPanel.tsx');
  const customerStatus = read('components/CustomerPortalPaymentIntentStatus.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const customerFinancialPage = read('app/customer-portal/financial/page.tsx');

  assertMarkers(sql, [
    'payment_intents_status_created_idx',
    'payment_intents_provider_idx',
    'payment_intents_payment_url_idx',
    'payment_intents_touch_updated_at',
    'before update on public.payment_intents'
  ], 'Payment intent admin flow migration');

  assertMarkers(adminApi, [
    'service_operations_payment_intents_read',
    'service_operations_payment_intent_update',
    'payment_intents',
    'update_payment_intent',
    'pending_invoice',
    'pending_payment_link',
    'ready',
    'paid',
    'invoice_id',
    'payment_url',
    'provider',
    'notification_outbox',
    'requireActorApi',
    'writeAuditLog',
    'export async function GET',
    'export async function POST'
  ], 'Admin payment intent API');
  assertNoSelectStar(adminApi, 'Admin payment intent API');

  assertMarkers(customerApi, [
    'CUSTOMER_ROLES',
    "'customer'",
    'customerIdsForProfile',
    'payment_intents',
    'customer_id',
    'customer_portal_payment_intents_read',
    'requireActorApi',
    'writeAuditLog',
    'export async function GET'
  ], 'Customer payment intent API');
  assertNoSelectStar(customerApi, 'Customer payment intent API');

  assertMarkers(adminPanel, [
    'ServiceOperationsPaymentIntentPanel',
    '/api/admin/service-operations/payment-intents?limit=20',
    '/api/admin/service-operations/payment-intents',
    'update_payment_intent',
    'Payment Intent Admin Panel',
    'Latest Payment Intents',
    'Update Payment Intent',
    'Save Payment Intent',
    'pending_invoice',
    'pending_payment_link',
    'ready',
    'paid',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsPaymentIntentPanel');
  assertNoBrowserStorage(adminPanel, 'ServiceOperationsPaymentIntentPanel');

  assertMarkers(customerStatus, [
    'CustomerPortalPaymentIntentStatus',
    '/api/customer-portal/payment-intents?limit=20',
    'Payment Intent Status',
    'Invoice & Payment Link Preparation',
    'Pending invoice / 等待发票',
    'Preparing payment link / 正在准备付款链接',
    'Ready to pay / 可以付款',
    'Pay Now / 立即付款',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'CustomerPortalPaymentIntentStatus');
  assertNoBrowserStorage(customerStatus, 'CustomerPortalPaymentIntentStatus');
  assert(!customerStatus.includes('<main'), 'CustomerPortalPaymentIntentStatus should not render nested main.');

  assertMarkers(servicePage, ['ServiceOperationsPaymentIntentPanel'], 'Service Operations page');
  assertMarkers(customerFinancialPage, ['CustomerPortalPaymentIntentStatus'], 'Customer financial page');
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  verifier: 'verify-payment-intent-flow',
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
