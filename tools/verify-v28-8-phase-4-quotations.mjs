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
const customerQuoteApi = read('app/api/customer-portal/quote-acceptance/route.ts');
const adminQuoteResponsesApi = read('app/api/admin/service-operations/quote-responses/route.ts');
const quotationPdfApi = read('app/api/admin/service-operations/quotation-pdfs/route.ts');
const customerFinancialUi = read('components/CustomerPortalFinancialOverview.tsx');
const quoteResponsePanel = read('components/ServiceOperationsQuoteResponsePanel.tsx');
const quotePdfPanel = read('components/ServiceOperationsQuotationPdfPanel.tsx');
const serviceOpsPage = read('app/service-operations/page.tsx');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-4-quotations-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 4 Quotations real module verification');
console.log('--------------------------------------------------');

must(Boolean(baselineDoc), 'Phase 4 Quotations baseline document exists');
must(baselineDoc.includes('Quotations Real Module Baseline') && baselineDoc.includes('Quotation Version / 报价版本'), 'Baseline document covers quotation and version chain');
must(baselineDoc.includes('Customer Response / 客户确认') && baselineDoc.includes('Quotation PDF / 报价 PDF'), 'Baseline document covers customer response and quotation PDF chain');

// Admin Service Operations quotation chain.
must(adminServiceOperationsApi.includes("'quotation'") && adminServiceOperationsApi.includes("const MACHINES = ['lead', 'service_request', 'inspection', 'quotation'"), 'Admin Service Operations supports quotation machine');
must(adminServiceOperationsApi.includes("key: 'quotations'") && adminServiceOperationsApi.includes("machine: 'quotation'") && adminServiceOperationsApi.includes("table: 'quotations'"), 'Admin Service Operations reads quotations table');
must(adminServiceOperationsApi.includes('quotation_id,service_request_id,customer_id,version,total_amount,currency,status,created_at,updated_at'), 'Admin Service Operations selects required quotation fields');
must(adminServiceOperationsApi.includes("quotation: ['service_request_id', 'customer_id', 'version', 'total_amount', 'currency', 'status']"), 'Admin Service Operations has quotation write whitelist');
must(adminServiceOperationsApi.includes("if (machine === 'quotation') return { version: 1, total_amount: amount, currency"), 'Admin Service Operations can create guarded draft quotation records');
must(adminServiceOperationsApi.includes("rpc('transition_status_tx'") && adminServiceOperationsApi.includes('service_operations_live_core_status_patch'), 'Admin Service Operations uses transaction RPC for quotation status transitions');
must(adminServiceOperationsApi.includes('service_operations_live_core_detail_read') && adminServiceOperationsApi.includes('service_operations_live_core_record_create') && adminServiceOperationsApi.includes('service_operations_live_core_record_update'), 'Admin Service Operations audits quotation detail/create/update through shared flows');

// Customer quote response and acceptance chain.
must(customerQuoteApi.includes("const CUSTOMER_ROLES = ['customer']") && customerQuoteApi.includes('requireActorApi(request, [...CUSTOMER_ROLES])'), 'Customer quote response API is customer-role guarded');
must(customerQuoteApi.includes("const RESPONSE_TYPES = ['accepted', 'declined', 'revision_requested']"), 'Customer quote response API supports accepted/declined/revision_requested');
must(customerQuoteApi.includes('loadVisibleOwnedQuotation') && customerQuoteApi.includes(".eq('visible_to_customer', true)"), 'Customer quote response API loads only visible owned quotations');
must(customerQuoteApi.includes('jobIdsForCustomers') && customerQuoteApi.includes("from('jobs')"), 'Customer quote response API links quotations through customer jobs');
must(customerQuoteApi.includes('latestVisibleQuotationPdf') && customerQuoteApi.includes("from('quotation_pdf_documents')"), 'Customer quote response API loads latest visible quotation PDF');
must(customerQuoteApi.includes("from('quotation_customer_responses')") && customerQuoteApi.includes('createCustomerResponse'), 'Customer quote response API writes quotation_customer_responses');
must(customerQuoteApi.includes('Customer message is required when declining or requesting revision'), 'Customer quote response API requires message for decline/revision');
must(customerQuoteApi.includes("from('quotation_acceptances')") && customerQuoteApi.includes('accepted_total') && customerQuoteApi.includes('accepted_version'), 'Customer quote acceptance API writes quotation_acceptances on acceptance');
must(customerQuoteApi.includes("from('payment_intents')") && customerQuoteApi.includes("status: 'pending_invoice'"), 'Customer quote acceptance API creates pending payment_intents');
must(customerQuoteApi.includes('customer_accepted') && customerQuoteApi.includes('customer_declined') && customerQuoteApi.includes('customer_revision_requested'), 'Customer quote response API updates quotation approval status');
must(customerQuoteApi.includes("from('unified_tasks')") && customerQuoteApi.includes("from('internal_inbox_messages')") && customerQuoteApi.includes("from('notification_outbox')"), 'Customer quote response API creates task, inbox and notification records');
must(customerQuoteApi.includes('customer_portal_quote_acceptance_submit') && customerQuoteApi.includes('customer_portal_quote_response_submit') && customerQuoteApi.includes('writeAuditLog'), 'Customer quote response API writes audit logs');
must(!/select\(['"]\*['"]\)/.test(customerQuoteApi), 'Customer quote response API does not use select star');

// Admin quote response revision chain.
must(adminQuoteResponsesApi.includes("const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support']") && adminQuoteResponsesApi.includes("const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance']"), 'Admin quote response API has internal read/write role boundary');
must(adminQuoteResponsesApi.includes("from('quotation_customer_responses')") && adminQuoteResponsesApi.includes('service_operations_quote_responses_read'), 'Admin quote response API reads quotation_customer_responses with audit');
must(adminQuoteResponsesApi.includes('review_quote_response') && adminQuoteResponsesApi.includes('resolve_quote_response'), 'Admin quote response API supports review and resolve actions');
must(adminQuoteResponsesApi.includes('create_revised_quotation_version') && adminQuoteResponsesApi.includes("from('quotation_versions')"), 'Admin quote response API creates revised quotation versions');
must(adminQuoteResponsesApi.includes("approval_status: 'revised_pending_customer'") && adminQuoteResponsesApi.includes('visible_to_customer: true'), 'Admin quote response API pushes revised quotations visible to customer');
must(adminQuoteResponsesApi.includes("from('unified_tasks')") && adminQuoteResponsesApi.includes("from('internal_inbox_messages')") && adminQuoteResponsesApi.includes("from('notification_outbox')"), 'Admin quote response API creates task, inbox and notification records');
must(adminQuoteResponsesApi.includes('service_operations_revised_quotation_version_create') && adminQuoteResponsesApi.includes('writeAuditLog'), 'Admin quote response API writes revised quotation audit log');
must(!/select\(['"]\*['"]\)/.test(adminQuoteResponsesApi), 'Admin quote response API does not use select star');

// Quotation PDF chain.
must(quotationPdfApi.includes("runtime = 'nodejs'") && quotationPdfApi.includes('buildQuotationPdf'), 'Quotation PDF API runs in Node and builds PDF server-side');
must(quotationPdfApi.includes('loadDocumentSettings') && quotationPdfApi.includes("from('document_company_settings')"), 'Quotation PDF API loads document company settings');
must(quotationPdfApi.includes('loadQuotation') && quotationPdfApi.includes("from('quotation_versions')"), 'Quotation PDF API loads quotation and latest quotation version');
must(quotationPdfApi.includes("from('quotation_pdf_documents')") && quotationPdfApi.includes("storage_path") && quotationPdfApi.includes("visible_to_customer"), 'Quotation PDF API writes quotation_pdf_documents');
must(quotationPdfApi.includes('supabase.storage.from(BUCKET).upload') && quotationPdfApi.includes('application/pdf'), 'Quotation PDF API uploads PDF to Supabase Storage');
must(quotationPdfApi.includes('pdf_storage_path') && quotationPdfApi.includes('customer_visible_at') && quotationPdfApi.includes('customer_visible_by'), 'Quotation PDF API updates quotation PDF path and visibility fields');
must(quotationPdfApi.includes("from('unified_tasks')") && quotationPdfApi.includes("from('internal_inbox_messages')") && quotationPdfApi.includes("from('notification_outbox')"), 'Quotation PDF API creates task, inbox and notification records');
must(quotationPdfApi.includes('service_operations_quotation_pdf_generate') && quotationPdfApi.includes('service_operations_quotation_pdf_generate_failed') && quotationPdfApi.includes('writeAuditLog'), 'Quotation PDF API writes success/failure audit logs');
must(!/select\(['"]\*['"]\)/.test(quotationPdfApi), 'Quotation PDF API does not use select star');

// UI baselines.
must(customerFinancialUi.includes('/api/customer-portal/quote-acceptance') && customerFinancialUi.includes('Accept Quote / 接受报价'), 'Customer financial UI calls quote response API and shows accept action');
must(customerFinancialUi.includes('Request Revision / 要求修改') && customerFinancialUi.includes('Decline / 不同意'), 'Customer financial UI supports revision and decline actions');
must(customerFinancialUi.includes('cannot edit quotation or invoice content'), 'Customer financial UI prevents customer-side quotation/invoice editing');
must(!/localStorage|sessionStorage/.test(customerFinancialUi), 'Customer financial UI does not use browser storage workflow state');
must(quoteResponsePanel.includes('ServiceOperationsQuoteResponsePanel') && quoteResponsePanel.includes('/api/admin/service-operations/quote-responses'), 'Service Operations quote response panel calls guarded admin API');
must(quoteResponsePanel.includes('Create Revised Quote / 创建新版报价') && quoteResponsePanel.includes('Resolve / 完成处理'), 'Service Operations quote response panel supports revise and resolve actions');
must(quotePdfPanel.includes('ServiceOperationsQuotationPdfPanel') && quotePdfPanel.includes('/api/admin/service-operations/quotation-pdfs'), 'Service Operations quotation PDF panel calls guarded admin API');
must(quotePdfPanel.includes('Generate Quotation PDF / 生成报价PDF') && quotePdfPanel.includes('Visible To Customer / 客户可见'), 'Service Operations quotation PDF panel supports generate and customer visibility');
must(!/localStorage|sessionStorage/.test(quoteResponsePanel + quotePdfPanel), 'Service Operations quotation panels do not use browser storage workflow state');
must(serviceOpsPage.includes('ServiceOperationsQuoteResponsePanel') && serviceOpsPage.includes('ServiceOperationsQuotationPdfPanel'), 'Service Operations page mounts quote response and quotation PDF panels');

// Production readiness chain.
for (const table of ['quotations','quotation_versions','quotation_acceptances','quotation_customer_responses','quotation_pdf_documents','jobs','invoices','payments','payment_intents','warranties','status_transition_logs','audit_logs','document_company_settings']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Quotations chain table ${table}`);
}
for (const table of ['unified_tasks','task_events','internal_inbox_messages','notification_outbox']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Quotations support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

must(packageJson.includes('"verify:v28-8-phase-4-quotations"'), 'package.json exposes V28.8 Phase 4 Quotations verifier');
warn(packageJson.includes('"verify:v28-8-phase-3-jobs"'), 'V28.8 Phase 3 Jobs verifier remains available');
warn(packageJson.includes('"verify:quote-acceptance"') && packageJson.includes('"verify:quote-response-revision"') && packageJson.includes('"verify:quotation-pdf"'), 'Existing quotation-specific verifiers remain available');

if (failures.length) {
  console.error(`\nV28.8 Phase 4 Quotations verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-4-quotations',
  failures,
  warnings,
  checked: {
    adminServiceOperationsQuotationChain: true,
    customerQuoteResponseChain: true,
    adminQuoteResponseRevisionChain: true,
    quotationPdfChain: true,
    quotationUiBaselines: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
