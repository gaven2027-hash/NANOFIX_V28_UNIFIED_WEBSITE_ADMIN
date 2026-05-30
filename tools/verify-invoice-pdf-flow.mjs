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
  'supabase/migrations/202605290014_invoice_pdf_documents.sql',
  'app/api/admin/service-operations/invoice-pdfs/route.ts',
  'components/ServiceOperationsInvoicePdfPanel.tsx',
  'app/service-operations/page.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing invoice PDF flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290014_invoice_pdf_documents.sql');
  const api = read('app/api/admin/service-operations/invoice-pdfs/route.ts');
  const panel = read('components/ServiceOperationsInvoicePdfPanel.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'public.invoice_pdf_documents',
    'invoice_id uuid not null references public.invoices',
    'storage_bucket text not null default',
    'storage_path text not null',
    'generation_status',
    'visible_to_customer boolean not null default false',
    'invoice_pdf_documents_invoice_idx',
    'invoice_pdf_documents_customer_idx',
    'invoice_pdf_documents_visible_idx',
    'enable row level security',
    'internal roles can read invoice pdf documents',
    'customers can read own visible invoice pdf documents',
    'service role can write invoice pdf documents'
  ], 'Invoice PDF documents migration');

  has(api, [
    'runtime = \'nodejs\'',
    'buildInvoicePdf',
    'loadInvoice',
    'invoice_items',
    'service-uploads',
    'invoice_pdf_documents',
    'generate_invoice_pdf',
    'pdf_storage_path',
    'customer_visible_at',
    'customer_visible_by',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'service_operations_invoice_pdf_generate',
    'service_operations_invoice_pdf_generate_failed',
    'writeAuditLog',
    'export async function GET',
    'export async function POST'
  ], 'Invoice PDF generation API');
  noSelectStar(api, 'Invoice PDF generation API');

  has(panel, [
    'ServiceOperationsInvoicePdfPanel',
    '/api/admin/service-operations/invoice-pdfs',
    'generate_invoice_pdf',
    'Invoice PDF Generator + Storage Linkage',
    'Generate PDF / 生成PDF',
    'Load PDFs / 读取PDF',
    'Visible To Customer / 客户可见',
    'service-uploads',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsInvoicePdfPanel');
  noBrowserStorage(panel, 'ServiceOperationsInvoicePdfPanel');

  has(servicePage, ['ServiceOperationsInvoicePdfPanel'], 'Service Operations page');
  has(ready, ['invoice_pdf_documents'], '/api/ready invoice PDF table check');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-invoice-pdf-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
