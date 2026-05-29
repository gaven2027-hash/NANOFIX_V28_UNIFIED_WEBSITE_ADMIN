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
  'supabase/migrations/202605290013_payment_checkout_sessions.sql',
  'app/api/admin/service-operations/payment-checkout-sessions/route.ts',
  'components/ServiceOperationsCheckoutSessionPanel.tsx',
  'app/service-operations/page.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing checkout session flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290013_payment_checkout_sessions.sql');
  const api = read('app/api/admin/service-operations/payment-checkout-sessions/route.ts');
  const panel = read('components/ServiceOperationsCheckoutSessionPanel.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'public.payment_checkout_sessions',
    'payment_intent_id uuid not null references public.payment_intents',
    'provider_external_id',
    'payment_url',
    'status text not null default',
    'request_json',
    'response_json',
    'checkout_session_id uuid references public.payment_checkout_sessions',
    'payment_checkout_sessions_intent_idx',
    'payment_checkout_sessions_provider_idx',
    'payment_checkout_sessions_status_idx',
    'payment_checkout_sessions_touch_updated_at',
    'enable row level security',
    'internal roles can read payment checkout sessions',
    'service role can write payment checkout sessions'
  ], 'Payment checkout sessions migration');

  has(api, [
    'payment_checkout_sessions',
    'create_checkout_session',
    'service_operations_payment_checkout_sessions_read',
    'service_operations_payment_checkout_session_create',
    'service_operations_payment_checkout_session_failed',
    'manual',
    'stripe',
    'hitpay',
    'buildManualCheckout',
    'buildConfiguredProviderPlaceholder',
    'manual provider requires payment_url',
    'live checkout call is intentionally disabled',
    'payment_intents',
    'checkout_session_id',
    'provider_external_id',
    'payment_url',
    'status: \'ready\'',
    'notification_outbox',
    'writeAuditLog',
    'export async function GET',
    'export async function POST'
  ], 'Payment checkout session API');
  noSelectStar(api, 'Payment checkout session API');

  has(panel, [
    'ServiceOperationsCheckoutSessionPanel',
    '/api/admin/service-operations/payment-checkout-sessions?limit=20',
    '/api/admin/service-operations/payment-checkout-sessions',
    'create_checkout_session',
    'Checkout Session Generator',
    'manual',
    'stripe',
    'hitpay',
    'Payment URL',
    'Provider External ID',
    'This creates a checkout/payment link only',
    'Create Checkout Session',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsCheckoutSessionPanel');
  noBrowserStorage(panel, 'ServiceOperationsCheckoutSessionPanel');

  has(servicePage, ['ServiceOperationsCheckoutSessionPanel'], 'Service Operations page');
  has(ready, ['payment_checkout_sessions'], '/api/ready checkout sessions table check');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-checkout-session-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
