#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const adminServiceOperationsApi = read('app/api/admin/service-operations/route.ts');
const adminPaymentIntentApi = read('app/api/admin/service-operations/payment-intents/route.ts');
const customerPaymentIntentApi = read('app/api/customer-portal/payment-intents/route.ts');
const checkoutSessionApi = read('app/api/admin/service-operations/payment-checkout-sessions/route.ts');
const paymentWebhookApi = read('app/api/webhooks/payments/route.ts');
const paymentIntentPanel = read('components/ServiceOperationsPaymentIntentPanel.tsx');
const checkoutSessionPanel = read('components/ServiceOperationsCheckoutSessionPanel.tsx');
const customerPaymentStatus = read('components/CustomerPortalPaymentIntentStatus.tsx');
const serviceOpsPage = read('app/service-operations/page.tsx');
const customerFinancialPage = read('app/customer-portal/financial/page.tsx');
const fullChainApi = read('app/api/admin/service-operations/full-chain/route.ts');
const paymentIntentMigration = read('supabase/migrations/202605290011_payment_intent_admin_flow.sql');
const paymentWebhookMigration = read('supabase/migrations/202605290012_payment_webhook_reconciliation.sql');
const checkoutMigration = read('supabase/migrations/202605290013_payment_checkout_sessions.sql');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-6-payments-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 6 Payments real module verification');
console.log('------------------------------------------------');

must(Boolean(baselineDoc), 'Phase 6 Payments baseline document exists');
must(baselineDoc.includes('Payments Real Module Baseline') && baselineDoc.includes('Payment Intent / 付款意图'), 'Baseline document covers payment intent chain');
must(baselineDoc.includes('Checkout Session / 付款链接') && baselineDoc.includes('Payment Webhook / 付款回调'), 'Baseline document covers checkout and webhook chain');
must(baselineDoc.includes('node tools/verify-v28-8-phase-6-payments.mjs'), 'Baseline document exposes direct Phase 6 verifier command');

// Admin Service Operations payment chain.
must(adminServiceOperationsApi.includes("'payment'") && adminServiceOperationsApi.includes("const MACHINES = ['lead', 'service_request', 'inspection', 'quotation', 'job', 'invoice', 'payment'"), 'Admin Service Operations supports payment machine');
must(adminServiceOperationsApi.includes("key: 'payments'") && adminServiceOperationsApi.includes("machine: 'payment'") && adminServiceOperationsApi.includes("table: 'payments'"), 'Admin Service Operations reads payments table');
must(adminServiceOperationsApi.includes('payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at,created_at'), 'Admin Service Operations selects required payment fields');
must(adminServiceOperationsApi.includes("payment: ['invoice_id', 'customer_id', 'amount', 'currency', 'status', 'reconciled_at']"), 'Admin Service Operations has payment write whitelist');
must(adminServiceOperationsApi.includes("if (machine === 'payment') return { amount") && adminServiceOperationsApi.includes("status: 'processing'"), 'Admin Service Operations can create guarded processing payment records');
must(adminServiceOperationsApi.includes("rpc('transition_status_tx'") && adminServiceOperationsApi.includes('service_operations_live_core_status_patch'), 'Admin Service Operations uses transaction RPC for payment status transitions');
must(adminServiceOperationsApi.includes('service_operations_live_core_detail_read') && adminServiceOperationsApi.includes('service_operations_live_core_record_create') && adminServiceOperationsApi.includes('service_operations_live_core_record_update'), 'Admin Service Operations audits payment detail/create/update through shared flows');

// Payment intent migration and APIs.
must(paymentIntentMigration.includes('payment_intents_status_created_idx') && paymentIntentMigration.includes('payment_intents_provider_idx') && paymentIntentMigration.includes('before update on public.payment_intents'), 'Payment intent migration keeps status/provider/update indexes and trigger');
must(adminPaymentIntentApi.includes("const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support']") && adminPaymentIntentApi.includes("const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance']"), 'Admin payment intent API has internal read/write role boundary');
must(adminPaymentIntentApi.includes("const STATUS_VALUES = ['pending_invoice', 'pending_payment_link', 'ready', 'paid', 'cancelled', 'failed']"), 'Admin payment intent API supports required statuses');
must(adminPaymentIntentApi.includes("from('payment_intents')") && adminPaymentIntentApi.includes('payment_intent_id,quotation_id,acceptance_id,invoice_id,job_id,customer_id,amount,currency,status,provider,provider_external_id,payment_url'), 'Admin payment intent API reads payment_intents with required fields');
must(adminPaymentIntentApi.includes('update_payment_intent') && adminPaymentIntentApi.includes('payment_url is required when status is ready'), 'Admin payment intent API supports guarded update and requires ready payment_url');
must(adminPaymentIntentApi.includes('provider_external_id') && adminPaymentIntentApi.includes("from('invoices')") && adminPaymentIntentApi.includes('payment_intent_id: paymentIntentId'), 'Admin payment intent API links invoice and provider external ID');
must(adminPaymentIntentApi.includes("from('notification_outbox')") && adminPaymentIntentApi.includes('NANOFIX payment link is ready'), 'Admin payment intent API queues customer notification');
must(adminPaymentIntentApi.includes('service_operations_payment_intents_read') && adminPaymentIntentApi.includes('service_operations_payment_intent_update') && adminPaymentIntentApi.includes('writeAuditLog'), 'Admin payment intent API writes read/update audit logs');
must(!/select\(['"]\*['"]\)/.test(adminPaymentIntentApi), 'Admin payment intent API does not use select star');

must(customerPaymentIntentApi.includes("const CUSTOMER_ROLES = ['customer']") && customerPaymentIntentApi.includes('requireActorApi(request, [...CUSTOMER_ROLES])'), 'Customer payment intent API is customer-role guarded');
must(customerPaymentIntentApi.includes('customerIdsForProfile') && customerPaymentIntentApi.includes(".eq('account_status', 'active')"), 'Customer payment intent API resolves active customers');
must(customerPaymentIntentApi.includes("from('payment_intents')") && customerPaymentIntentApi.includes(".in('customer_id', customerIds)") && customerPaymentIntentApi.includes('payment_url'), 'Customer payment intent API reads own customer payment intents');
must(customerPaymentIntentApi.includes('customer_portal_payment_intents_read') && customerPaymentIntentApi.includes('writeAuditLog'), 'Customer payment intent API writes read audit log');
must(!/select\(['"]\*['"]\)/.test(customerPaymentIntentApi), 'Customer payment intent API does not use select star');

// Checkout sessions.
must(checkoutMigration.includes('public.payment_checkout_sessions') && checkoutMigration.includes('payment_intent_id uuid not null references public.payment_intents'), 'Payment checkout migration defines sessions linked to payment intents');
must(checkoutMigration.includes('enable row level security') && checkoutMigration.includes('service role can write payment checkout sessions'), 'Payment checkout migration keeps RLS/service-role write boundary');
must(checkoutSessionApi.includes("const PROVIDERS = ['manual', 'stripe', 'hitpay']"), 'Checkout session API supports manual/stripe/hitpay providers');
must(checkoutSessionApi.includes('buildManualCheckout') && checkoutSessionApi.includes('manual provider requires payment_url'), 'Checkout session API requires manual payment_url');
must(checkoutSessionApi.includes('buildConfiguredProviderPlaceholder') && checkoutSessionApi.includes('intentionally disabled until provider-specific request signing is completed'), 'Checkout session API guards live provider adapters');
must(checkoutSessionApi.includes('Payment intent is already paid') && checkoutSessionApi.includes("status: 'ready'"), 'Checkout session API prevents paid intent and sets ready only for checkout link');
must(checkoutSessionApi.includes("from('payment_checkout_sessions')") && checkoutSessionApi.includes('checkout_session_id') && checkoutSessionApi.includes('provider_external_id'), 'Checkout session API writes payment_checkout_sessions');
must(checkoutSessionApi.includes("from('payment_intents')") && checkoutSessionApi.includes('checkout_session_id: session.checkout_session_id') && checkoutSessionApi.includes('payment_url: adapterResult.paymentUrl'), 'Checkout session API updates payment intent with checkout details');
must(checkoutSessionApi.includes("from('invoices')") && checkoutSessionApi.includes('payment_url: adapterResult.paymentUrl'), 'Checkout session API updates linked invoice payment_url');
must(checkoutSessionApi.includes("from('notification_outbox')") && checkoutSessionApi.includes('NANOFIX payment link is ready'), 'Checkout session API queues customer notification');
must(checkoutSessionApi.includes('service_operations_payment_checkout_sessions_read') && checkoutSessionApi.includes('service_operations_payment_checkout_session_create') && checkoutSessionApi.includes('service_operations_payment_checkout_session_failed'), 'Checkout session API writes read/create/failure audit actions');
must(!/select\(['"]\*['"]\)/.test(checkoutSessionApi), 'Checkout session API does not use select star');

// Payment webhook reconciliation.
must(paymentWebhookMigration.includes('public.payment_webhook_events') && paymentWebhookMigration.includes('unique (provider, provider_event_id)') && paymentWebhookMigration.includes('payment_webhook_events_intent_idx'), 'Payment webhook migration defines idempotent webhook events');
must(paymentWebhookApi.includes('verifyWebhookSecret') && paymentWebhookApi.includes('x-nanofix-signature') && paymentWebhookApi.includes('hmac'), 'Payment webhook API verifies shared secret or HMAC');
must(paymentWebhookApi.includes('parseWebhook') && paymentWebhookApi.includes('providerEventId') && paymentWebhookApi.includes('providerExternalId') && paymentWebhookApi.includes('paymentIntentId') && paymentWebhookApi.includes('invoiceId'), 'Payment webhook API parses provider/invoice/intent identifiers');
must(paymentWebhookApi.includes("from('payment_webhook_events')") && paymentWebhookApi.includes('provider_event_id') && paymentWebhookApi.includes('duplicate key'), 'Payment webhook API writes webhook events and handles duplicates');
must(paymentWebhookApi.includes('findPaymentIntent') && paymentWebhookApi.includes('provider_external_id') && paymentWebhookApi.includes(".eq('invoice_id', input.invoiceId)"), 'Payment webhook API finds payment intent by intent, provider external ID or invoice');
must(paymentWebhookApi.includes('providerStatusToInternal') && paymentWebhookApi.includes("return 'paid'") && paymentWebhookApi.includes("return 'failed'"), 'Payment webhook API maps provider statuses to internal statuses');
must(paymentWebhookApi.includes('reconcilePayment') && paymentWebhookApi.includes("from('payment_intents')") && paymentWebhookApi.includes('last_webhook_event_id'), 'Payment webhook API reconciles payment intent status');
must(paymentWebhookApi.includes("from('payments')") && paymentWebhookApi.includes("from('payment_transactions')") && paymentWebhookApi.includes("from('invoices')"), 'Payment webhook API writes payments, transactions and invoice status');
must(paymentWebhookApi.includes("from('unified_tasks')") && paymentWebhookApi.includes("from('task_events')") && paymentWebhookApi.includes("from('internal_inbox_messages')"), 'Payment webhook API creates finance task, task event and inbox message');
must(paymentWebhookApi.includes("from('notification_outbox')") && paymentWebhookApi.includes('NANOFIX payment received'), 'Payment webhook API queues customer payment notification');
must(paymentWebhookApi.includes('payment_webhook_reconciled') && paymentWebhookApi.includes('payment_webhook_unmatched') && paymentWebhookApi.includes('payment_webhook_failed') && paymentWebhookApi.includes('writeAuditLog'), 'Payment webhook API writes reconciled/unmatched/failed audit logs');
must(!/select\(['"]\*['"]\)/.test(paymentWebhookApi), 'Payment webhook API does not use select star');

// UI baselines.
must(paymentIntentPanel.includes('ServiceOperationsPaymentIntentPanel') && paymentIntentPanel.includes('/api/admin/service-operations/payment-intents'), 'Service Operations payment intent panel calls guarded admin API');
must(paymentIntentPanel.includes('Payment Intent Admin Panel') && paymentIntentPanel.includes('Update Payment Intent') && paymentIntentPanel.includes('Save Payment Intent'), 'Service Operations payment intent panel supports update action');
must(paymentIntentPanel.includes('pending_invoice') && paymentIntentPanel.includes('pending_payment_link') && paymentIntentPanel.includes('ready') && paymentIntentPanel.includes('paid'), 'Service Operations payment intent panel exposes required statuses');
must(paymentIntentPanel.includes("credentials: 'same-origin'") && paymentIntentPanel.includes("cache: 'no-store'"), 'Service Operations payment intent panel uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(paymentIntentPanel), 'Service Operations payment intent panel does not use browser storage workflow state');
must(checkoutSessionPanel.includes('ServiceOperationsCheckoutSessionPanel') && checkoutSessionPanel.includes('/api/admin/service-operations/payment-checkout-sessions'), 'Service Operations checkout session panel calls guarded admin API');
must(checkoutSessionPanel.includes('Checkout Session Generator') && checkoutSessionPanel.includes('manual') && checkoutSessionPanel.includes('stripe') && checkoutSessionPanel.includes('hitpay'), 'Service Operations checkout session panel exposes provider choices');
must(checkoutSessionPanel.includes('This creates a checkout/payment link only') && checkoutSessionPanel.includes('不会把付款标记为成功'), 'Service Operations checkout session panel warns checkout does not mark paid');
must(checkoutSessionPanel.includes("credentials: 'same-origin'") && checkoutSessionPanel.includes("cache: 'no-store'"), 'Service Operations checkout session panel uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(checkoutSessionPanel), 'Service Operations checkout session panel does not use browser storage workflow state');
must(customerPaymentStatus.includes('CustomerPortalPaymentIntentStatus') && customerPaymentStatus.includes('/api/customer-portal/payment-intents?limit=20'), 'Customer payment status UI calls customer payment intent API');
must(customerPaymentStatus.includes('Payment Intent Status') && customerPaymentStatus.includes('Ready to pay / 可以付款') && customerPaymentStatus.includes('Pay Now / 立即付款'), 'Customer payment status UI shows ready/pay states');
must(customerPaymentStatus.includes("intent.status === 'ready'") && customerPaymentStatus.includes('paymentUrl'), 'Customer payment status UI shows Pay Now only when ready and URL exists');
must(!/localStorage|sessionStorage/.test(customerPaymentStatus), 'Customer payment status UI does not use browser storage workflow state');
must(serviceOpsPage.includes('ServiceOperationsPaymentIntentPanel') && serviceOpsPage.includes('ServiceOperationsCheckoutSessionPanel'), 'Service Operations page mounts payment intent and checkout session panels');
must(customerFinancialPage.includes('CustomerPortalPaymentIntentStatus'), 'Customer financial page mounts payment intent status component');

// Full-chain payment linkage.
must(fullChainApi.includes("safeList(supabase, 'payments', 'payments'") && fullChainApi.includes('payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at,created_at'), 'Full-chain API reads payments with required fields');
must(fullChainApi.includes('linkedPayments = payments.filter((payment) => linkedInvoiceIds.has(String(payment.invoice_id'), 'Full-chain API links payments through invoice_id');
must(fullChainApi.includes('has_payment: linkedPayments.length > 0'), 'Full-chain API includes payment completeness flag');
must(fullChainApi.includes('service_operations_full_chain_read') && fullChainApi.includes('writeAuditLog'), 'Full-chain API writes read audit log');
must(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(fullChainApi), 'Full-chain API remains read-only for business records');

// Production readiness chain.
for (const table of ['payments','payment_intents','payment_webhook_events','payment_checkout_sessions','invoices','invoice_pdf_documents','jobs','quotations','quotation_acceptances','warranties','status_transition_logs','audit_logs']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Payments chain table ${table}`);
}
for (const table of ['unified_tasks','task_events','internal_inbox_messages','notification_outbox']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Payments support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

warn(packageJson.includes('"verify:v28-8-phase-6-payments"'), 'package.json exposes V28.8 Phase 6 Payments npm alias');
warn(packageJson.includes('"verify:payment-intent"') && packageJson.includes('"verify:payment-webhook"') && packageJson.includes('"verify:payment-checkout"'), 'Existing payment verifiers remain available');

if (failures.length) {
  console.error(`\nV28.8 Phase 6 Payments verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-6-payments',
  failures,
  warnings,
  checked: {
    adminServiceOperationsPaymentChain: true,
    paymentIntentChain: true,
    checkoutSessionChain: true,
    paymentWebhookReconciliation: true,
    paymentUiBaselines: true,
    fullChainPaymentLinkage: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
