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
const warrantyPdfApi = read('app/api/admin/service-operations/warranty-pdfs/route.ts');
const customerWarrantiesApi = read('app/api/customer-portal/warranties/route.ts');
const warrantyPdfPanel = read('components/ServiceOperationsWarrantyPdfPanel.tsx');
const customerWarrantyDownloads = read('components/CustomerPortalWarrantyDownloads.tsx');
const serviceOperationsLiveCore = read('components/ServiceOperationsLiveCore.tsx');
const serviceOpsPage = read('app/service-operations/page.tsx');
const customerWarrantyPage = read('app/customer-portal/warranties/page.tsx');
const fullChainApi = read('app/api/admin/service-operations/full-chain/route.ts');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-7-warranties-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 7 Warranties real module verification');
console.log('--------------------------------------------------');

must(Boolean(baselineDoc), 'Phase 7 Warranties baseline document exists');
must(baselineDoc.includes('Warranties Real Module Baseline') && baselineDoc.includes('Warranty PDF / 保修单 PDF'), 'Baseline document covers warranty and warranty PDF chain');
must(baselineDoc.includes('Warranty Claim / 保修索赔') && baselineDoc.includes('Support / 后续支持'), 'Baseline document covers warranty claim and support chain');
must(baselineDoc.includes('node tools/verify-v28-8-phase-7-warranties.mjs'), 'Baseline document exposes direct Phase 7 verifier command');

// Admin Service Operations warranty chain.
must(adminServiceOperationsApi.includes("'warranty'") && adminServiceOperationsApi.includes("const MACHINES = ['lead', 'service_request', 'inspection', 'quotation', 'job', 'invoice', 'payment', 'receipt', 'warranty'"), 'Admin Service Operations supports warranty machine');
must(adminServiceOperationsApi.includes("key: 'warranties'") && adminServiceOperationsApi.includes("machine: 'warranty'") && adminServiceOperationsApi.includes("table: 'warranties'"), 'Admin Service Operations reads warranties table');
must(adminServiceOperationsApi.includes('warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on,visible_to_customer,public_ref,created_at'), 'Admin Service Operations selects required warranty fields');
must(adminServiceOperationsApi.includes("warranty: ['job_id', 'customer_id', 'invoice_id', 'quotation_id', 'status', 'coverage', 'starts_on', 'ends_on', 'visible_to_customer', 'public_ref']"), 'Admin Service Operations has warranty write whitelist');
must(adminServiceOperationsApi.includes("if (machine === 'warranty') return { status: 'draft'") && adminServiceOperationsApi.includes('visible_to_customer: false'), 'Admin Service Operations can create guarded draft warranty records');
must(adminServiceOperationsApi.includes("rpc('transition_status_tx'") && adminServiceOperationsApi.includes('service_operations_live_core_status_patch'), 'Admin Service Operations uses transaction RPC for warranty status transitions');
must(adminServiceOperationsApi.includes('service_operations_live_core_detail_read') && adminServiceOperationsApi.includes('service_operations_live_core_record_create') && adminServiceOperationsApi.includes('service_operations_live_core_record_update'), 'Admin Service Operations audits warranty detail/create/update through shared flows');

// Warranty PDF chain.
must(warrantyPdfApi.includes("runtime = 'nodejs'") && warrantyPdfApi.includes('buildWarrantyPdf'), 'Warranty PDF API runs in Node and builds PDF server-side');
must(warrantyPdfApi.includes('loadWarranty') && warrantyPdfApi.includes("from('warranties')") && warrantyPdfApi.includes('warranty_id,job_id,customer_id,status,coverage'), 'Warranty PDF API loads warranty record');
must(warrantyPdfApi.includes('loadSettings') && warrantyPdfApi.includes("from('document_company_settings')"), 'Warranty PDF API loads document company settings');
must(warrantyPdfApi.includes("from('warranty_pdf_documents')") && warrantyPdfApi.includes('warranty_version') && warrantyPdfApi.includes('storage_path'), 'Warranty PDF API writes warranty_pdf_documents');
must(warrantyPdfApi.includes('supabase.storage.from(BUCKET).upload') && warrantyPdfApi.includes('application/pdf'), 'Warranty PDF API uploads PDF to Supabase Storage');
must(warrantyPdfApi.includes('pdf_storage_path') && warrantyPdfApi.includes('pdf_generated_at') && warrantyPdfApi.includes('customer_visible_at') && warrantyPdfApi.includes('customer_visibility_notes'), 'Warranty PDF API updates warranty PDF and visibility fields');
must(warrantyPdfApi.includes("from('unified_tasks')") && warrantyPdfApi.includes("from('task_events')") && warrantyPdfApi.includes("from('internal_inbox_messages')"), 'Warranty PDF API creates task, task event and inbox records');
must(warrantyPdfApi.includes("from('notification_outbox')") && warrantyPdfApi.includes('NANOFIX warranty certificate is ready'), 'Warranty PDF API queues customer notification when visible');
must(warrantyPdfApi.includes('service_operations_warranty_pdf_generate') && warrantyPdfApi.includes('service_operations_warranty_pdf_generate_failed') && warrantyPdfApi.includes('writeAuditLog'), 'Warranty PDF API writes success/failure audit logs');
must(!/select\(['"]\*['"]\)/.test(warrantyPdfApi), 'Warranty PDF API does not use select star');

// Customer portal warranty visibility.
must(customerWarrantiesApi.includes("const CUSTOMER_ROLES = ['customer']") && customerWarrantiesApi.includes('requireActorApi(request, [...CUSTOMER_ROLES])'), 'Customer warranties API is customer-role guarded');
must(customerWarrantiesApi.includes('customerIdsForProfile') && customerWarrantiesApi.includes(".eq('account_status', 'active')"), 'Customer warranties API resolves active customers');
must(customerWarrantiesApi.includes("from('warranties')") && customerWarrantiesApi.includes(".in('customer_id', customerIds)") && customerWarrantiesApi.includes(".eq('visible_to_customer', true)"), 'Customer warranties API reads only visible own warranties');
must(customerWarrantiesApi.includes('visibleWarrantyPdfs') && customerWarrantiesApi.includes("from('warranty_pdf_documents')") && customerWarrantiesApi.includes(".eq('visible_to_customer', true)") && customerWarrantiesApi.includes(".in('generation_status', ['generated', 'uploaded'])"), 'Customer warranties API reads only visible generated/uploaded warranty PDFs');
must(customerWarrantiesApi.includes('createSignedUrl') && customerWarrantiesApi.includes('signed_download_url'), 'Customer warranties API creates signed warranty PDF download URLs');
must(customerWarrantiesApi.includes('customer_portal_warranties_read') && customerWarrantiesApi.includes('writeAuditLog'), 'Customer warranties API writes read audit log');
must(!/select\(['"]\*['"]\)/.test(customerWarrantiesApi), 'Customer warranties API does not use select star');

// UI baselines.
must(serviceOperationsLiveCore.includes("key: 'warranties'") && serviceOperationsLiveCore.includes('Warranties') && serviceOperationsLiveCore.includes('保修'), 'Service Operations UI exposes Warranties group');
must(serviceOperationsLiveCore.includes("machine: 'warranty'") && serviceOperationsLiveCore.includes("idField: 'warranty_id'") && serviceOperationsLiveCore.includes("nextStatus: 'active'"), 'Service Operations UI locks warranty machine, id and next status');
must(serviceOperationsLiveCore.includes('postCreate(active.machine)') && serviceOperationsLiveCore.includes('patchStatus(active.machine') && serviceOperationsLiveCore.includes('patchUpdate(active, row)'), 'Service Operations UI supports warranty create/status/update through shared flows');
must(warrantyPdfPanel.includes('ServiceOperationsWarrantyPdfPanel') && warrantyPdfPanel.includes('/api/admin/service-operations/warranty-pdfs'), 'Service Operations warranty PDF panel calls guarded admin API');
must(warrantyPdfPanel.includes('generate_warranty_pdf') && warrantyPdfPanel.includes('Generate Warranty PDF') && warrantyPdfPanel.includes('Visible To Customer / 客户可见'), 'Service Operations warranty PDF panel supports generate and customer visibility');
must(warrantyPdfPanel.includes("credentials: 'same-origin'") && warrantyPdfPanel.includes("cache: 'no-store'"), 'Service Operations warranty PDF panel uses guarded no-store requests');
must(!/localStorage|sessionStorage/.test(warrantyPdfPanel), 'Service Operations warranty PDF panel does not use browser storage workflow state');
must(customerWarrantyPage.includes('CustomerPortalWarrantyDownloads') && customerWarrantyPage.includes('Warranty Records & PDFs'), 'Customer warranties page mounts warranty download component');
must(customerWarrantyDownloads.includes('/api/customer-portal/warranties?limit=50') && customerWarrantyDownloads.includes('View & Download Warranty PDFs'), 'Customer warranty UI calls customer warranty API');
must(customerWarrantyDownloads.includes('Only warranties and PDF certificates linked to your own customer account') && customerWarrantyDownloads.includes('signed_download_url'), 'Customer warranty UI explains customer-owned visible signed links');
must(customerWarrantyDownloads.includes('Download PDF / 下载 PDF') && customerWarrantyDownloads.includes('PDF not visible yet'), 'Customer warranty UI shows download and unavailable states');
must(!/localStorage|sessionStorage/.test(customerWarrantyDownloads), 'Customer warranty UI does not use browser storage workflow state');

// Warranty claim / support page mounting.
for (const marker of [
  'ServiceOperationsWarrantyClaimReviewPanel',
  'ServiceOperationsWarrantyClaimRoutingPanel',
  'ServiceOperationsWarrantyClaimMessageReplyPanel',
  'ServiceOperationsWarrantyClaimAttachmentReviewPanel',
  'ServiceOperationsWarrantyClaimClosurePanel',
  'ServiceOperationsWarrantyClaimSatisfactionFollowupPanel',
  'ServiceOperationsWarrantySatisfactionNotificationRulesPanel',
  'ServiceOperationsWarrantySatisfactionAuditTrailPanel'
]) {
  must(serviceOpsPage.includes(marker), `Service Operations page mounts ${marker}`);
}
must(serviceOpsPage.includes('ServiceOperationsWarrantyPdfPanel'), 'Service Operations page mounts Warranty PDF panel');

// Full-chain warranty linkage.
must(fullChainApi.includes("safeList(supabase, 'warranties', 'warranties'") && fullChainApi.includes('warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on,visible_to_customer,public_ref,created_at'), 'Full-chain API reads warranties with required fields');
must(fullChainApi.includes('linkedWarranties = warranties.filter') && fullChainApi.includes('linkedJobIds.has(String(warranty.job_id') && fullChainApi.includes('linkedQuotationIds.has(String(warranty.quotation_id') && fullChainApi.includes('linkedInvoiceIds.has(String(warranty.invoice_id'), 'Full-chain API links warranties through job, quotation or invoice');
must(fullChainApi.includes('has_warranty: linkedWarranties.length > 0'), 'Full-chain API includes warranty completeness flag');
must(fullChainApi.includes('service_operations_full_chain_read') && fullChainApi.includes('writeAuditLog'), 'Full-chain API writes read audit log');
must(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(fullChainApi), 'Full-chain API remains read-only for business records');

// Production readiness chain.
for (const table of ['warranties','warranty_pdf_documents','warranty_claims','jobs','quotations','invoices','payments','customers','status_transition_logs','audit_logs','document_company_settings']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Warranties chain table ${table}`);
}
for (const table of ['unified_tasks','task_events','internal_inbox_messages','notification_outbox']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Warranties support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

warn(packageJson.includes('"verify:v28-8-phase-7-warranties"'), 'package.json exposes V28.8 Phase 7 Warranties npm alias');
warn(packageJson.includes('"verify:warranty-pdf"') || packageJson.includes('"verify:warranty"'), 'Existing warranty verifier alias remains available');

if (failures.length) {
  console.error(`\nV28.8 Phase 7 Warranties verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-7-warranties',
  failures,
  warnings,
  checked: {
    adminServiceOperationsWarrantyChain: true,
    warrantyPdfChain: true,
    customerPortalWarrantyVisibility: true,
    warrantyUiBaselines: true,
    warrantyClaimSupportPanels: true,
    fullChainWarrantyLinkage: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
