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
  'docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md',
  'supabase/migrations/202605290010_quote_acceptance_payment_intent.sql',
  'app/api/customer-portal/quote-acceptance/route.ts',
  'components/CustomerPortalFinancialOverview.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing quote acceptance flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const memory = read('docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md');
  const sql = read('supabase/migrations/202605290010_quote_acceptance_payment_intent.sql');
  const api = read('app/api/customer-portal/quote-acceptance/route.ts');
  const ui = read('components/CustomerPortalFinancialOverview.tsx');
  const ready = read('app/api/ready/route.ts');

  assertMarkers(memory, [
    'Use this file as the single project memory reference',
    'Keep Customer Portal separate from the Internal Admin App',
    'No localStorage workflow state and no fake-success fallback are allowed'
  ], 'V28.2 master memory');

  assertMarkers(sql, [
    'public.quotation_acceptances',
    'public.payment_intents',
    'acceptance_id uuid primary key',
    'quotation_id uuid not null references public.quotations',
    'customer_id uuid references public.customers',
    'accepted_by_profile_id uuid references public.profiles',
    'accepted_total numeric',
    'public.invoices',
    'quotation_id uuid references public.quotations',
    'payment_intent_id uuid references public.payment_intents',
    'quotation_acceptances_quotation_idx',
    'quotation_acceptances_customer_idx',
    'payment_intents_quotation_idx',
    'payment_intents_customer_idx',
    'enable row level security',
    'customers can read own quotation acceptances',
    'customers can read own payment intents',
    'service role can write quotation acceptances',
    'service role can write payment intents'
  ], 'Quote acceptance migration');

  assertMarkers(api, [
    'CUSTOMER_ROLES',
    "'customer'",
    'requireActorApi',
    'loadVisibleOwnedQuotation',
    'visible_to_customer',
    'customerIdsForProfile',
    'jobIdsForCustomers',
    'quotation_acceptances',
    'payment_intents',
    'pending_invoice',
    'customer_accepted',
    'createTaskAndInbox',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'queueCustomerConfirmation',
    'notification_outbox',
    'customer_portal_quote_acceptance_submit',
    'writeAuditLog',
    'export async function POST'
  ], 'Customer quote acceptance API');
  assertNoSelectStar(api, 'Customer quote acceptance API');

  assertMarkers(ui, [
    'CustomerPortalFinancialOverview',
    '/api/customer-portal/quote-acceptance',
    'Accept Quote / 接受报价',
    'Quotation accepted. NANOFIX will prepare the invoice and payment link',
    'acceptQuotation',
    'onAccept',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'Customer financial quote acceptance UI');
  assertNoBrowserStorage(ui, 'Customer financial quote acceptance UI');
  assert(!ui.includes('<main'), 'CustomerPortalFinancialOverview should not render nested main.');

  assertMarkers(ready, ['quotation_acceptances', 'payment_intents'], '/api/ready table checks');
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  verifier: 'verify-quote-acceptance-flow',
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
