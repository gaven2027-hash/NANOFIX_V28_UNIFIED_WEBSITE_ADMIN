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
  'supabase/migrations/202605290022_warranty_pdf_documents.sql',
  'app/api/admin/service-operations/warranty-pdf/route.ts',
  'app/api/customer-portal/warranties/route.ts',
  'components/ServiceOperationsWarrantyPdfPanel.tsx',
  'components/CustomerPortalWarrantyDownloads.tsx',
  'app/customer-portal/warranties/page.tsx',
  'components/CustomerPortalShell.tsx',
  'app/service-operations/page.tsx',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing warranty PDF customer download flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290022_warranty_pdf_documents.sql');
  const adminApi = read('app/api/admin/service-operations/warranty-pdf/route.ts');
  const customerApi = read('app/api/customer-portal/warranties/route.ts');
  const adminPanel = read('components/ServiceOperationsWarrantyPdfPanel.tsx');
  const customerPanel = read('components/CustomerPortalWarrantyDownloads.tsx');
  const customerPage = read('app/customer-portal/warranties/page.tsx');
  const shell = read('components/CustomerPortalShell.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const pkg = read('package.json');

  has(sql, [
    'create table if not exists public.warranty_pdf_documents',
    'warranty_pdf_id',
    'warranty_id',
    'customer_id',
    'warranty_version',
    'storage_bucket',
    'storage_path',
    'visible_to_customer',
    'customer_visible_at',
    'customer_visible_by',
    'generation_status',
    'customers can read own visible warranty pdfs',
    'internal roles can read warranty pdfs',
    'service role can manage warranty pdfs',
    'pdf_storage_path',
    'warranties_customer_visible_idx'
  ], 'Warranty PDF documents migration');

  has(adminApi, [
    'generate_warranty_pdf',
    'regenerate_warranty_pdf',
    'set_warranty_pdf_customer_visibility',
    'warranty_pdf_documents',
    'visible_to_customer',
    'customer_visible_at',
    'notification_outbox',
    'internal_inbox_messages',
    'unified_tasks',
    'task_events',
    'service_operations_generate_warranty_pdf',
    'service_operations_regenerate_warranty_pdf',
    'service_operations_warranty_pdf_customer_visibility_set',
    'writeAuditLog'
  ], 'Admin warranty PDF API');
  noSelectStar(adminApi, 'Admin warranty PDF API');

  has(customerApi, [
    'customerIdsForProfile',
    'warranties',
    'warranty_pdf_documents',
    'visible_to_customer',
    'generation_status',
    'storage_path',
    'customer_portal_warranties_read',
    'requireActorApi',
    'CUSTOMER_ROLES'
  ], 'Customer portal warranties API');
  noSelectStar(customerApi, 'Customer portal warranties API');
  assert(!/from\(['"]warranties['"]\)\s*\.\s*(?:insert|update|upsert|delete)/.test(customerApi), 'Customer warranties API must not mutate warranties.');
  assert(!/from\(['"]warranty_pdf_documents['"]\)\s*\.\s*(?:insert|update|upsert|delete)/.test(customerApi), 'Customer warranties API must not mutate warranty PDFs.');

  has(adminPanel, [
    'ServiceOperationsWarrantyPdfPanel',
    '/api/admin/service-operations/warranty-pdf',
    'generate_warranty_pdf',
    'regenerate_warranty_pdf',
    'set_warranty_pdf_customer_visibility',
    'Warranty Certificate PDF Generator + Customer Download',
    'Visible To Customer',
    'Regenerate',
    'Set Visibility'
  ], 'ServiceOperationsWarrantyPdfPanel');
  noBrowserStorage(adminPanel, 'ServiceOperationsWarrantyPdfPanel');

  has(customerPanel, [
    'CustomerPortalWarrantyDownloads',
    '/api/customer-portal/warranties',
    'View & Download Warranty PDFs',
    'Only warranties and PDF certificates linked to your own customer account',
    'Download PDF',
    'visible_to_customer'
  ], 'CustomerPortalWarrantyDownloads');
  noBrowserStorage(customerPanel, 'CustomerPortalWarrantyDownloads');

  has(customerPage, ['CustomerPortalWarrantyDownloads'], 'Customer warranty downloads page');
  has(shell, ['/customer-portal/warranties', 'Warranties'], 'Customer portal warranty navigation');
  has(servicePage, ['ServiceOperationsWarrantyPdfPanel'], 'Service Operations warranty PDF panel mount');
  has(pkg, ['verify:warranty-pdf-download', 'verify-warranty-pdf-customer-download-flow.mjs', 'validate:predeploy'], 'package warranty PDF verifier');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-pdf-customer-download-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
