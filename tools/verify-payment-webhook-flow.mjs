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

const requiredFiles = [
  'supabase/migrations/202605290012_payment_webhook_reconciliation.sql',
  'app/api/webhooks/payments/route.ts',
  'app/api/admin/service-operations/payment-intents/route.ts',
  'components/ServiceOperationsPaymentIntentPanel.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing payment webhook flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290012_payment_webhook_reconciliation.sql');
  const webhook = read('app/api/webhooks/payments/route.ts');
  const adminIntentApi = read('app/api/admin/service-operations/payment-intents/route.ts');
  const adminPanel = read('components/ServiceOperationsPaymentIntentPanel.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'provider_external_id',
    'last_webhook_event_id',
    'public.payment_webhook_events',
    'provider_event_id text not null',
    'processing_status',
    'unique (provider, provider_event_id)',
    'payment_intents_provider_external_idx',
    'payment_webhook_events_provider_created_idx',
    'payment_webhook_events_status_idx',
    'payment_webhook_events_intent_idx',
    'enable row level security',
    'internal roles can read payment webhook events',
    'service role can write payment webhook events'
  ], 'Payment webhook reconciliation migration');

  has(webhook, [
    'verifyWebhookSecret',
    'payment_webhook_events',
    'provider_event_id',
    'duplicate key',
    'findPaymentIntent',
    'provider_external_id',
    'providerStatusToInternal',
    'reconcilePayment',
    'payment_intents',
    'last_webhook_event_id',
    'payments',
    'payment_transactions',
    'invoices',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'payment_webhook_reconciled',
    'payment_webhook_unmatched',
    'payment_webhook_failed',
    'writeAuditLog',
    'export async function POST'
  ], 'Payment webhook API');
  noSelectStar(webhook, 'Payment webhook API');

  has(adminIntentApi, [
    'provider_external_id',
    'service_operations_payment_intent_update',
    'update_payment_intent',
    'payment_intents',
    'notification_outbox'
  ], 'Admin payment intent API');
  noSelectStar(adminIntentApi, 'Admin payment intent API');

  has(adminPanel, [
    'Provider External ID',
    'provider_external_id',
    'Save Payment Intent'
  ], 'Payment intent admin panel');
  noBrowserStorage(adminPanel, 'Payment intent admin panel');

  has(ready, ['payment_webhook_events'], '/api/ready payment webhook table check');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-payment-webhook-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
