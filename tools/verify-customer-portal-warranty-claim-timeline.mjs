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
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const requiredFiles = [
  'app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts',
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'tools/verify-customer-portal-warranty-claim-detail.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.5 customer warranty claim timeline file: ${file}`);

if (requiredFiles.every(exists)) {
  const api = read('app/api/customer-portal/warranty-claims/[serviceRequestId]/route.ts');
  const detail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const detailVerifier = read('tools/verify-customer-portal-warranty-claim-detail.mjs');
  const pkg = read('package.json');

  has(api, [
    'TimelineItem',
    'buildCustomerTimeline',
    'customer_timeline',
    'claim_submitted',
    'linked_warranty_found',
    'admin_reviewed',
    'claim_routed',
    'job_created',
    'job_scheduled',
    'quotation_visible',
    'invoice_visible',
    'warranty_pdf_visible',
    'payment_record_visible',
    'sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())',
    'customer_portal_warranty_claim_detail_read'
  ], 'Phase D.4.5 customer timeline API');
  noSelectStar(api, 'Phase D.4.5 customer timeline API');

  has(detail, [
    'customer_timeline',
    'TimelinePanel',
    'Customer Timeline',
    '客户可读进度时间线',
    'event_key',
    'timestamp',
    'object_type',
    'object_id',
    '<TimelinePanel items={timeline} />',
    'Warranty Claim Read-Only View',
    'PdfButton',
    '>PDF</a>'
  ], 'Phase D.4.5 customer timeline UI');
  noBrowserStorage(detail, 'Phase D.4.5 customer timeline UI');
  noCustomerMutation(detail, 'Phase D.4.5 customer timeline UI');
  noDownloadPrompt(detail, 'Phase D.4.5 customer timeline UI');

  has(detailVerifier, [
    'verify-customer-portal-warranty-claim-detail.mjs',
    'CustomerPortalWarrantyClaimDetail',
    'This page is read-only'
  ], 'Phase D.4.4 detail verifier remains present');

  has(pkg, [
    'verify:customer-warranty-claim-timeline',
    'verify-customer-portal-warranty-claim-timeline.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.5 timeline gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-customer-portal-warranty-claim-timeline', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
