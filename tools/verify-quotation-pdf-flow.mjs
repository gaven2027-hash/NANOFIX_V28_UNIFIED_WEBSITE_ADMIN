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
  'supabase/migrations/202605290016_quotation_pdf_documents.sql',
  'app/api/admin/service-operations/quotation-pdfs/route.ts',
  'components/ServiceOperationsQuotationPdfPanel.tsx',
  'app/service-operations/page.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing quotation PDF flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290016_quotation_pdf_documents.sql');
  const api = read('app/api/admin/service-operations/quotation-pdfs/route.ts');
  const panel = read('components/ServiceOperationsQuotationPdfPanel.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'public.quotation_pdf_documents',
    'quotation_id uuid not null references public.quotations',
    'quotation_version integer',
    'storage_bucket text not null default',
    'storage_path text not null',
    'visible_to_customer boolean not null default false',
    'quotation_pdf_documents_quotation_idx',
    'quotation_pdf_documents_customer_idx',
    'quotation_pdf_documents_visible_idx',
    'enable row level security',
    'internal roles can read quotation pdf documents',
    'customers can read own visible quotation pdf documents',
    'service role can write quotation pdf documents'
  ], 'Quotation PDF documents migration');

  has(api, [
    'runtime = \'nodejs\'',
    'buildQuotationPdf',
    'loadDocumentSettings',
    'document_company_settings',
    'loadQuotation',
    'quotation_versions',
    'quotation_pdf_documents',
    'generate_quotation_pdf',
    'pdf_storage_path',
    'customer_visible_at',
    'customer_visible_by',
    'nanofix_quotation_polished_v1',
    'QUOTATION',
    'Acceptance:',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'service_operations_quotation_pdf_generate',
    'service_operations_quotation_pdf_generate_failed',
    'writeAuditLog',
    'export async function GET',
    'export async function POST'
  ], 'Quotation PDF generation API');
  noSelectStar(api, 'Quotation PDF generation API');

  has(panel, [
    'ServiceOperationsQuotationPdfPanel',
    '/api/admin/service-operations/quotation-pdfs',
    'generate_quotation_pdf',
    'Quotation PDF Generator + Customer Acceptance Linkage',
    'Generate Quotation PDF / 生成报价PDF',
    'Load PDFs / 读取PDF',
    'Visible To Customer / 客户可见',
    'Accept Quote',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsQuotationPdfPanel');
  noBrowserStorage(panel, 'ServiceOperationsQuotationPdfPanel');

  has(servicePage, ['ServiceOperationsQuotationPdfPanel'], 'Service Operations page');
  has(ready, ['quotation_pdf_documents'], '/api/ready quotation PDF table check');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-quotation-pdf-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
