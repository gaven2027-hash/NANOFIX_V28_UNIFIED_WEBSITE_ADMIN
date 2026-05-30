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
  'supabase/migrations/202605290020_warranty_auto_generation_customer_document_control.sql',
  'supabase/migrations/202605290021_auto_generate_warranty_on_job_completion.sql',
  'app/api/admin/service-operations/financial-documents/route.ts',
  'app/api/customer-portal/quote-acceptance/route.ts',
  'app/api/admin/service-operations/customer-documents/route.ts',
  'components/ServiceOperationsFinancialEditors.tsx',
  'components/ServiceOperationsCustomerDocumentControlPanel.tsx',
  'app/service-operations/page.tsx',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing warranty auto generation/customer document control file: ${file}`);

if (requiredFiles.every(exists)) {
  const fieldsSql = read('supabase/migrations/202605290020_warranty_auto_generation_customer_document_control.sql');
  const triggerSql = read('supabase/migrations/202605290021_auto_generate_warranty_on_job_completion.sql');
  const financialApi = read('app/api/admin/service-operations/financial-documents/route.ts');
  const quoteAcceptanceApi = read('app/api/customer-portal/quote-acceptance/route.ts');
  const customerDocumentsApi = read('app/api/admin/service-operations/customer-documents/route.ts');
  const financialEditors = read('components/ServiceOperationsFinancialEditors.tsx');
  const customerDocumentPanel = read('components/ServiceOperationsCustomerDocumentControlPanel.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const pkg = read('package.json');

  has(fieldsSql, [
    'alter table public.quotations',
    'confirmed_warranty_years',
    'warranty_terms',
    'warranty_confirmed_by',
    'warranty_confirmed_at',
    'alter table public.quotation_versions',
    'warranty_years',
    'alter table public.quotation_acceptances',
    'accepted_warranty_years',
    'accepted_warranty_terms_snapshot',
    'alter table public.warranties',
    'customer_id',
    'source_quotation_id',
    'source_acceptance_id',
    'source_invoice_id',
    'auto_generated',
    'generation_source',
    'terms_snapshot',
    'metadata_json'
  ], 'Warranty fields migration');

  has(triggerSql, [
    'auto_generate_warranty_after_job_completion',
    'security definer',
    "new.status not in ('completed','repair_completed','closed','done')",
    'quotation_acceptances',
    'accepted_warranty_years',
    'accepted_warranty_terms_snapshot',
    'insert into public.warranties',
    'auto_generated',
    'job_completion',
    'source_acceptance_id',
    'source_quotation_id',
    'drop trigger if exists auto_generate_warranty_after_job_completion on public.jobs'
  ], 'Auto warranty generation trigger migration');

  has(financialApi, [
    'cleanWarrantyYears',
    'confirmed_warranty_years',
    'warranty_terms',
    'warranty_confirmed_by',
    'warranty_confirmed_at',
    'warranty_years',
    'terms_snapshot',
    'source_quotation_id',
    'source_acceptance_id',
    'source_invoice_id',
    'service_operations_quotation_version_save',
    'service_operations_warranty_issue',
    'writeAuditLog'
  ], 'Financial documents API warranty support');
  noSelectStar(financialApi, 'Financial documents API warranty support');

  has(quoteAcceptanceApi, [
    'confirmed_warranty_years',
    'warranty_terms',
    'accepted_warranty_years',
    'accepted_warranty_terms_snapshot',
    'accepted_warranty_years: warrantyYears',
    'accepted_warranty_terms_snapshot: warrantyTerms',
    'Warranty will be auto-generated after job completion',
    'customer_portal_quote_response_submit'
  ], 'Quote acceptance warranty snapshot lock');
  noSelectStar(quoteAcceptanceApi, 'Quote acceptance warranty snapshot lock');

  has(customerDocumentsApi, [
    'findCustomers',
    'customer ID, profile/account ID, phone, email or name',
    'quotations',
    'invoices',
    'warranties',
    'acceptances',
    'confirmed_warranty_years',
    'accepted_warranty_years',
    'update_customer_quotation',
    'update_customer_invoice',
    'update_customer_warranty',
    'service_operations_customer_documents_search',
    'service_operations_customer_quotation_update',
    'service_operations_customer_invoice_update',
    'service_operations_customer_warranty_update',
    'writeAuditLog'
  ], 'Customer document control API');
  noSelectStar(customerDocumentsApi, 'Customer document control API');

  has(financialEditors, [
    'Warranty Years / 保修年限',
    'Warranty Terms / 保修条款',
    'warranty_years',
    'warranty_terms',
    'confirmed quotation scope',
    'Source Acceptance ID',
    'Source Invoice ID',
    'Terms Snapshot'
  ], 'ServiceOperationsFinancialEditors warranty inputs');
  noBrowserStorage(financialEditors, 'ServiceOperationsFinancialEditors warranty inputs');

  has(customerDocumentPanel, [
    'ServiceOperationsCustomerDocumentControlPanel',
    '/api/admin/service-operations/customer-documents',
    'Customer ID / account ID / phone / email / name',
    'Search & Revise Customer Quotations, Invoices and Warranties',
    'Update Quotation',
    'Update Invoice',
    'Update Warranty',
    'Warranty Years',
    'Save Official Document',
    'Audit Logs'
  ], 'Customer document control panel');
  noBrowserStorage(customerDocumentPanel, 'Customer document control panel');

  has(servicePage, ['ServiceOperationsCustomerDocumentControlPanel'], 'Service Operations page');
  has(pkg, ['verify:warranty-auto-generation', 'verify-warranty-auto-generation-admin-documents.mjs', 'validate:predeploy'], 'package predeploy warranty verifier');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-auto-generation-admin-documents', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
