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
const invoicePdfApi = read('app/api/admin/service-operations/invoice-pdfs/route.ts');
const invoicePdfPanel = read('components/ServiceOperationsInvoicePdfPanel.tsx');
const serviceOperationsLiveCore = read('components/ServiceOperationsLiveCore.tsx');
const customerFinancialApi = read('app/api/customer-portal/financial/route.ts');
const customerFinancialUi = read('components/CustomerPortalFinancialOverview.tsx');
const fullChainApi = read('app/api/admin/service-operations/full-chain/route.ts');
const invoicePdfMigration = read('supabase/migrations/202605290014_invoice_pdf_documents.sql');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-5-invoices-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 5 Invoices real module verification');
console.log('------------------------------------------------');

must(Boolean(baselineDoc), 'Phase 5 Invoices baseline document exists');
must(baselineDoc.includes('Invoices Real Module Baseline') && baselineDoc.includes('Invoice PDF / 发票 PDF'), 'Baseline document covers invoice and invoice PDF chain');
must(baselineDoc.includes('Payment / 付款') && baselineDoc.includes('Warranty / 保修'), 'Baseline document covers payment and warranty downstream linkage');
must(baselineDoc.includes('node tools/verify-v28-8-phase-5-invoices.mjs'), 'Baseline document exposes direct Phase 5 verifier command');

// Admin Service Operations invoice chain.
must(adminServiceOperationsApi.includes("'invoice'") && adminServiceOperationsApi.includes("const MACHINES = ['lead', 'service_request', 'inspection', 'quotation', 'job', 'invoice'"), 'Admin Service Operations supports invoice machine');
must(adminServiceOperationsApi.includes("key: 'invoices'") && adminServiceOperationsApi.includes("machine: 'invoice'") && adminServiceOperationsApi.includes("table: 'invoices'"), 'Admin Service Operations reads invoices table');
must(adminServiceOperationsApi.includes('invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status,visible_to_customer,created_at'), 'Admin Service Operations selects required invoice fields');
must(adminServiceOperationsApi.includes("invoice: ['invoice_no', 'customer_id', 'job_id', 'quotation_id', 'total_amount', 'currency', 'status', 'visible_to_customer']"), 'Admin Service Operations has invoice write whitelist');
must(adminServiceOperationsApi.includes("if (machine === 'invoice') return { invoice_no:") && adminServiceOperationsApi.includes("status: 'draft'") && adminServiceOperationsApi.includes('visible_to_customer: false'), 'Admin Service Operations can create guarded draft invoice records');
must(adminServiceOperationsApi.includes("rpc('transition_status_tx'") && adminServiceOperationsApi.includes('service_operations_live_core_status_patch'), 'Admin Service Operations uses transaction RPC for invoice status transitions');
must(adminServiceOperationsApi.includes('service_operations_live_core_detail_read') && adminServiceOperationsApi.includes('service_operations_live_core_record_create') && adminServiceOperationsApi.includes('service_operations_live_core_record_update'), 'Admin Service Operations audits invoice detail/create/update through shared flows');

// Invoice PDF migration and API chain.
must(invoicePdfMigration.includes('public.invoice_pdf_documents') && invoicePdfMigration.includes('invoice_id uuid not null references public.invoices'), 'Invoice PDF migration defines invoice_pdf_documents linked to invoices');
must(invoicePdfMigration.includes('visible_to_customer boolean not null default false') && invoicePdfMigration.includes('customers can read own visible invoice pdf documents'), 'Invoice PDF migration keeps customer-visible RLS boundary');
must(invoicePdfApi.includes("runtime = 'nodejs'") && invoicePdfApi.includes('buildInvoicePdf'), 'Invoice PDF API runs in Node and builds PDF server-side');
must(invoicePdfApi.includes('loadInvoice') && invoicePdfApi.includes("from('invoices')") && invoicePdfApi.includes("from('invoice_items')"), 'Invoice PDF API loads invoice and invoice_items');
must(invoicePdfApi.includes('loadDocumentSettings') && invoicePdfApi.includes("from('document_company_settings')"), 'Invoice PDF API loads document company settings');
must(invoicePdfApi.includes("from('invoice_pdf_documents')") && invoicePdfApi.includes('storage_path') && invoicePdfApi.includes('visible_to_customer'), 'Invoice PDF API writes invoice_pdf_documents');
must(invoicePdfApi.includes('supabase.storage.from(BUCKET).upload') && invoicePdfApi.includes('application/pdf'), 'Invoice PDF API uploads PDF to Supabase Storage');
must(invoicePdfApi.includes('pdf_storage_path') && invoicePdfApi.includes('customer_visible_at') && invoicePdfApi.includes('customer_visible_by'), 'Invoice PDF API updates invoice PDF path and visibility fields');
must(invoicePdfApi.includes("from('unified_tasks')") && invoicePdfApi.includes("from('task_events')") && invoicePdfApi.includes("from('internal_inbox_messages')"), 'Invoice PDF API creates task, task event and inbox records');
must(invoicePdfApi.includes("from('notification_outbox')") && invoicePdfApi.includes('NANOFIX invoice PDF is ready'), 'Invoice PDF API queues customer notification when visible');
must(invoicePdfApi.includes('service_operations_invoice_pdf_generate') && invoicePdfApi.includes('service_operations_invoice_pdf_generate_failed') && invoicePdfApi.includes('writeAuditLog'), 'Invoice PDF API writes success/failure audit logs');
must(!/select\(['"]\*['"]\)/.test(invoicePdfApi), 'Invoice PDF API does not use select star');

// Customer Portal invoice visibility chain.
must(customerFinancialApi.includes("const ALLOWED_ROLES = ['customer', 'super_admin', 'operations_admin', 'support']"), 'Customer financial API has explicit allowed roles');
must(customerFinancialApi.includes('customerIdsForProfile') && customerFinancialApi.includes(".eq('account_status', 'active')"), 'Customer financial API resolves active customers for logged-in profile');
must(customerFinancialApi.includes('jobIdsForCustomers') && customerFinancialApi.includes("from('service_requests')") && customerFinancialApi.includes("from('jobs')"), 'Customer financial API resolves customer job IDs from service requests and direct jobs');
must(customerFinancialApi.includes("from('invoices')") && customerFinancialApi.includes(".in('job_id', jobIds)") && customerFinancialApi.includes(".eq('visible_to_customer', true)"), 'Customer financial API loads only visible customer-linked invoices');
must(customerFinancialApi.includes('withSignedPdf') && customerFinancialApi.includes('createSignedUrl'), 'Customer financial API creates signed invoice PDF URLs');
must(customerFinancialApi.includes("from('payments')") && customerFinancialApi.includes(".in('invoice_id', invoiceIds)") && customerFinancialApi.includes(".eq('visible_to_customer', true)"), 'Customer financial API loads visible payments for visible invoices');
must(customerFinancialApi.includes('customer_portal_financial_read') && customerFinancialApi.includes('writeAuditLog'), 'Customer financial API writes read audit log');
must(!/select\(['"]\*['"]\)/.test(customerFinancialApi), 'Customer financial API does not use select star');

// UI baselines.
must(serviceOperationsLiveCore.includes("key: 'invoices'") && serviceOperationsLiveCore.includes('Invoices') && serviceOperationsLiveCore.includes('发票'), 'Service Operations UI exposes Invoices group');
must(serviceOperationsLiveCore.includes("machine: 'invoice'") && serviceOperationsLiveCore.includes("idField: 'invoice_id'") && serviceOperationsLiveCore.includes("nextStatus: 'sent'"), 'Service Operations UI locks invoice machine, id and next status');
must(serviceOperationsLiveCore.includes('postCreate(active.machine)') && serviceOperationsLiveCore.includes('patchStatus(active.machine') && serviceOperationsLiveCore.includes('patchUpdate(active, row)'), 'Service Operations UI supports invoice create/status/update through shared flows');
must(serviceOperationsLiveCore.includes('degraded') && serviceOperationsLiveCore.includes('errors'), 'Service Operations UI keeps degraded/error handling');
must(invoicePdfPanel.includes('ServiceOperationsInvoicePdfPanel') && invoicePdfPanel.includes('/api/admin/service-operations/invoice-pdfs'), 'Service Operations invoice PDF panel calls guarded admin API');
must(invoicePdfPanel.includes('generate_invoice_pdf') && invoicePdfPanel.includes('Generate PDF / 生成PDF') && invoicePdfPanel.includes('Visible To Customer / 客户可见'), 'Service Operations invoice PDF panel supports generate and customer visibility');
must(invoicePdfPanel.includes("credentials: 'same-origin'") && invoicePdfPanel.includes("cache: 'no-store'"), 'Service Operations invoice PDF panel uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(invoicePdfPanel), 'Service Operations invoice PDF panel does not use browser storage workflow state');
must(customerFinancialUi.includes('/api/customer-portal/financial') && customerFinancialUi.includes('Invoices') && customerFinancialUi.includes('发票'), 'Customer financial UI calls financial API and shows Invoices section');
must(customerFinancialUi.includes('Pay Now / 立即付款') && customerFinancialUi.includes('PDF'), 'Customer financial UI shows payment and PDF actions when available');
must(customerFinancialUi.includes('cannot edit quotation, invoice, warranty or payment content'), 'Customer financial UI prevents customer-side financial content editing');
must(!/localStorage|sessionStorage/.test(customerFinancialUi), 'Customer financial UI does not use browser storage workflow state');

// Full-chain invoices linkage.
must(fullChainApi.includes("safeList(supabase, 'invoices', 'invoices'") && fullChainApi.includes('invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status,visible_to_customer,created_at'), 'Full-chain API reads invoices with required fields');
must(fullChainApi.includes('linkedInvoices = invoices.filter') && fullChainApi.includes('linkedJobIds.has(String(invoice.job_id') && fullChainApi.includes('linkedQuotationIds.has(String(invoice.quotation_id'), 'Full-chain API links invoices through job_id and quotation_id');
must(fullChainApi.includes('linkedPayments = payments.filter((payment) => linkedInvoiceIds.has(String(payment.invoice_id'), 'Full-chain API links payments through invoice_id');
must(fullChainApi.includes('linkedInvoiceIds.has(String(warranty.invoice_id'), 'Full-chain API links warranties through invoice_id');
must(fullChainApi.includes('has_invoice: linkedInvoices.length > 0'), 'Full-chain API includes invoice completeness flag');
must(fullChainApi.includes('service_operations_full_chain_read') && fullChainApi.includes('writeAuditLog'), 'Full-chain API writes read audit log');
must(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(fullChainApi), 'Full-chain API remains read-only for business records');

// Production readiness chain.
for (const table of ['invoices','invoice_pdf_documents','payments','payment_intents','payment_webhook_events','payment_checkout_sessions','jobs','quotations','quotation_acceptances','warranties','status_transition_logs','audit_logs','document_company_settings']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Invoices chain table ${table}`);
}
for (const table of ['unified_tasks','task_events','internal_inbox_messages','notification_outbox']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Invoices support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

warn(packageJson.includes('"verify:v28-8-phase-5-invoices"'), 'package.json exposes V28.8 Phase 5 Invoices npm alias');
warn(packageJson.includes('"verify:v28-8-phase-4-quotations"') || packageJson.includes('"verify:quotation-pdf"'), 'Quotation/invoice-adjacent verifiers remain available');
warn(packageJson.includes('"verify:invoice-pdf"'), 'Existing invoice PDF verifier remains available');

if (failures.length) {
  console.error(`\nV28.8 Phase 5 Invoices verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-5-invoices',
  failures,
  warnings,
  checked: {
    adminServiceOperationsInvoiceChain: true,
    invoicePdfChain: true,
    customerPortalInvoiceVisibility: true,
    invoiceUiBaselines: true,
    fullChainInvoiceLinkage: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
