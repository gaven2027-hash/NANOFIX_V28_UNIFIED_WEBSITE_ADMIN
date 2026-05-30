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
const noCustomerMutation = (content, label) => assert(!/fetch\([^)]*\/api\/customer-portal\/warranty-claims[^)]*method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/s.test(content), `${label} must not mutate warranty claim details from Customer Portal.`);
const noDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not mutate official documents.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const requiredFiles = [
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'app/customer-portal/warranty-claims/[serviceRequestId]/page.tsx',
  'components/CustomerPortalRecordsOverview.tsx',
  'tools/verify-customer-portal-warranty-claim-tracking.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.4 customer warranty claim detail file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts');
  const detail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const page = read('app/customer-portal/warranty-claims/[serviceRequestId]/page.tsx');
  const records = read('components/CustomerPortalRecordsOverview.tsx');
  const trackingVerifier = read('tools/verify-customer-portal-warranty-claim-tracking.mjs');
  const pkg = read('package.json');

  has(api, [
    'customer_portal_warranty_claim_detail_read',
    'requireActorApi',
    'customerIdsForProfile',
    'serviceRequestId',
    'service_requests',
    'request_origin',
    'customer_portal_request_type',
    'warranty_repair',
    'related_warranty',
    'routed_jobs',
    'quotations',
    'quotation_versions',
    'invoices',
    'payments',
    'warranty_pdfs',
    'visible_to_customer',
    'createSignedUrl',
    'has_download',
    'writeAuditLog'
  ], 'Phase D.4.4 warranty claim detail API');
  noSelectStar(api, 'Phase D.4.4 warranty claim detail API');
  noDocumentMutation(api, 'Phase D.4.4 warranty claim detail API');

  has(detail, [
    'CustomerPortalWarrantyClaimDetail',
    '/api/customer-portal/warranty-claims/${serviceRequestId}',
    'Warranty Claim Read-Only View',
    'This page is read-only',
    'Claim Summary',
    'Linked Warranty',
    'Routed Jobs',
    'Quotations',
    'Invoices',
    'Warranty PDFs',
    'Payments',
    'PdfButton',
    '>PDF</a>',
    'Pay Now / 立即付款',
    'Back / 返回'
  ], 'Phase D.4.4 warranty claim detail UI');
  noBrowserStorage(detail, 'Phase D.4.4 warranty claim detail UI');
  noCustomerMutation(detail, 'Phase D.4.4 warranty claim detail UI');
  noDownloadPrompt(detail, 'Phase D.4.4 warranty claim detail UI');

  has(page, [
    'CustomerPortalShell',
    'CustomerPortalWarrantyClaimDetail',
    'serviceRequestId',
    "export const dynamic = 'force-dynamic'"
  ], 'Phase D.4.4 warranty claim detail page');
  assert(!page.includes('AdminShell'), 'Phase D.4.4 detail page must not use AdminShell.');

  has(records, [
    'warrantyClaimHref',
    '/customer-portal/warranty-claims/${id}',
    'View / 查看',
    'Warranty Claim Tracking'
  ], 'Customer records links to D.4.4 detail page');
  noBrowserStorage(records, 'Customer records links to D.4.4 detail page');

  has(trackingVerifier, [
    'Warranty Claim Tracking',
    'OptionalPdfButton',
    'verify:customer-warranty-claim-tracking'
  ], 'D.4.3 customer tracking verifier remains present');

  has(pkg, [
    'verify:customer-warranty-claim-detail',
    'verify-customer-portal-warranty-claim-detail.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.4 warranty claim detail gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-warranty-claim-detail', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
