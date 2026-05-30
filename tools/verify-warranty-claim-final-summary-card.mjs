import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
const noCustomerDocumentMutation = (content, label) => assert(!/from\(['"](?:quotations|invoices|warranties|payments|payment_records)['"]\)\s*\.\s*(?:update|insert|upsert|delete)/.test(content), `${label} must not mutate official quotation, invoice, warranty or payment records.`);
const noDownloadPrompt = (content, label) => {
  assert(!content.includes('Download PDF / 下载PDF'), `${label} must not use download-prompt wording.`);
  assert(!/must\s+download|need\s+to\s+download|required\s+to\s+download|必须下载|需要下载|要求客户下载/i.test(content), `${label} must not imply customers must download documents.`);
};

const requiredFiles = [
  'components/CustomerPortalWarrantyClaimDetail.tsx',
  'tools/verify-warranty-claim-completion-closure.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing Phase D.4.11 warranty claim final summary card file: ${file}`);

if (requiredFiles.every(exists)) {
  const detail = read('components/CustomerPortalWarrantyClaimDetail.tsx');
  const closureVerifier = read('tools/verify-warranty-claim-completion-closure.mjs');
  const pkg = read('package.json');

  has(detail, [
    'FinalSummaryCard',
    'SummaryCounts',
    'loadWarrantyClaimAttachments',
    'Final Summary Card / 最终摘要卡',
    'Warranty Claim Final Status',
    'Warranty Claim Current Status',
    'Next Action / 下一步',
    'Completed / 完成',
    'Closed / 关闭',
    'Original Warranty / 原保修',
    'Decision / 审核',
    'Jobs / 工单',
    'Quotations / 报价',
    'Invoices / 发票',
    'Payments / 付款',
    'Warranty PDFs / 保修PDF',
    'Messages / 留言',
    'Attachments / 附件',
    'Timeline / 时间线',
    '<FinalSummaryCard serviceRequestId={serviceRequestId}',
    'warranty_claim_closure_status',
    'warranty_claim_completed_at',
    'warranty_claim_closed_at',
    'warranty_claim_completion_summary',
    'warranty_claim_closure_notes'
  ], 'Phase D.4.11 customer warranty claim final summary card');
  noBrowserStorage(detail, 'Phase D.4.11 customer warranty claim final summary card');
  noCustomerDocumentMutation(detail, 'Phase D.4.11 customer warranty claim final summary card');
  noDownloadPrompt(detail, 'Phase D.4.11 customer warranty claim final summary card');

  has(closureVerifier, [
    'verify-warranty-claim-completion-closure.mjs',
    'warranty_claim_completed',
    'Warranty claim completed',
    'warranty_claim_closed'
  ], 'Phase D.4.10 completion closure verifier remains present');

  has(pkg, [
    'verify:warranty-claim-final-summary-card',
    'verify-warranty-claim-final-summary-card.mjs',
    'validate:predeploy'
  ], 'package predeploy Phase D.4.11 final summary card gate');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-claim-final-summary-card', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
