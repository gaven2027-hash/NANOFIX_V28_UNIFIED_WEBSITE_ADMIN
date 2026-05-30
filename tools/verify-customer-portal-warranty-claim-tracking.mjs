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
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not let customers mutate official quotation, invoice, warranty or payment records.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const requiredFiles = [
  'app/api/customer-portal/records/route.ts',
  'app/api/customer-portal/financial/route.ts',
  'components/CustomerPortalRecordsOverview.tsx',
  'components/CustomerPortalFinancialOverview.tsx',
  'components/CustomerPortalDashboard.tsx',
  'tools/verify-service-operations-live-core.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.3 customer portal tracking/document file: ${file}`);

if (requiredFiles.every(exists)) {
  const recordsApi = read('app/api/customer-portal/records/route.ts');
  const financialApi = read('app/api/customer-portal/financial/route.ts');
  const recordsUi = read('components/CustomerPortalRecordsOverview.tsx');
  const financialUi = read('components/CustomerPortalFinancialOverview.tsx');
  const dashboard = read('components/CustomerPortalDashboard.tsx');
  const serviceOpsVerifier = read('tools/verify-service-operations-live-core.mjs');
  const pkg = read('package.json');

  has(recordsApi, [
    'warranty_claims',
    'warranty_claim_decision',
    'warranty_claim_next_action',
    'warranty_claim_routing_status',
    'warranty_claim_routed_job_id',
    'warranty_claim_routed_quotation_id',
    'customer_portal_records_read'
  ], 'Customer portal records API warranty claim tracking');
  noSelectStar(recordsApi, 'Customer portal records API warranty claim tracking');
  noCustomerDocumentMutation(recordsApi, 'Customer portal records API warranty claim tracking');

  has(financialApi, [
    'warranties',
    'warranty_pdfs',
    'warranty_pdf_documents',
    'visible_to_customer',
    'pdf_download_url',
    'has_download',
    'createSignedUrl',
    'customer_portal_financial_read'
  ], 'Customer portal optional document API');
  noSelectStar(financialApi, 'Customer portal optional document API');
  noCustomerDocumentMutation(financialApi, 'Customer portal optional document API');

  has(recordsUi, [
    'Warranty Claim Tracking',
    'warranty_claim_decision',
    'warranty_claim_next_action',
    'warranty_claim_routing_status',
    'warranty_claim_routed_job_id',
    'warranty_claim_routed_quotation_id',
    'Customer Visible',
    '/api/customer-portal/records?limit=20'
  ], 'Customer portal records tracking UI');
  noBrowserStorage(recordsUi, 'Customer portal records tracking UI');

  has(financialUi, [
    'Customer Documents / 客户文件',
    'Quotations, Invoices & Warranties',
    'OptionalPdfButton',
    '>PDF</a>',
    'WarrantyCard',
    'Warranty PDFs',
    'pdf_download_url',
    'has_download',
    '/api/customer-portal/financial?limit=20'
  ], 'Customer portal optional document UI');
  noBrowserStorage(financialUi, 'Customer portal optional document UI');
  noDownloadPrompt(financialUi, 'Customer portal optional document UI');

  has(dashboard, [
    'Repair requests, warranty claims, jobs, invoices, payments and warranties.',
    'Quotations, invoices, warranties, payment links and payment status.',
    'Documents',
    'approved photos, videos and documents'
  ], 'Customer portal dashboard document wording');
  noDownloadPrompt(dashboard, 'Customer portal dashboard document wording');

  has(serviceOpsVerifier, [
    'warranty_claims',
    'OptionalPdfButton',
    '>PDF</a>',
    'must not prompt customers to download PDFs'
  ], 'Service operations live core verifier updated for optional PDF labels');

  has(pkg, [
    'verify:customer-warranty-claim-tracking',
    'verify-customer-portal-warranty-claim-tracking.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.3 customer tracking gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-warranty-claim-tracking', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
