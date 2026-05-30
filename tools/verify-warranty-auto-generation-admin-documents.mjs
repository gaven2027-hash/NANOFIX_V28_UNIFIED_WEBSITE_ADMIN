import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);

const requiredFiles = [
  'supabase/migrations/202605290020_warranty_auto_generation_and_admin_lookup.sql',
  'app/api/admin/service-operations/warranty-auto-generation/route.ts',
  'app/api/admin/customer-center/documents/route.ts',
  'components/AdminCustomerDocumentsPanel.tsx',
  'app/customer-center/page.tsx'
];

for (const file of requiredFiles) assert(exists(file), `Missing warranty auto generation/admin documents file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290020_warranty_auto_generation_and_admin_lookup.sql');
  const warrantyApi = read('app/api/admin/service-operations/warranty-auto-generation/route.ts');
  const customerDocsApi = read('app/api/admin/customer-center/documents/route.ts');
  const panel = read('components/AdminCustomerDocumentsPanel.tsx');
  const customerCenterPage = read('app/customer-center/page.tsx');

  has(sql, [
    'alter table public.quotations',
    'warranty_years',
    'warranty_terms',
    'warranty_confirmed_at',
    'alter table public.quotation_versions',
    'alter table public.jobs',
    'confirmed_warranty_years',
    'repair_completed_at',
    'warranty_generated_at',
    'alter table public.warranties',
    'customer_id',
    'quotation_id',
    'invoice_id',
    'warranty_no',
    'generated_from',
    'repair_completion',
    'warranties_unique_job_repair_completion_idx',
    'warranties_customer_lookup_idx',
    'invoices_customer_lookup_idx'
  ], 'Warranty auto generation migration');

  has(warrantyApi, [
    'generate_warranty_after_repair_completion',
    'confirmed_warranty_years',
    'confirmed_warranty_terms',
    'repair_completed_at',
    'warranty_generated_at',
    'warranty_years',
    'warranty_terms',
    'repair_completion',
    'visible_to_customer',
    'warranty_generated_after_repair_completion',
    'service_operations_warranty_auto_generate_after_repair_completion',
    'notification_outbox',
    'internal_inbox_messages',
    'writeAuditLog'
  ], 'Warranty auto generation API');

  has(customerDocsApi, [
    'findCustomers',
    'customerDocuments',
    'customer ID, account/profile ID, phone, email or name',
    'quotations',
    'invoices',
    'warranties',
    'warranty_years',
    'warranty_terms',
    'visible_to_customer',
    'admin_customer_documents_lookup',
    'admin_customer_document_update',
    'requireActorApi',
    'WRITE_ROLES'
  ], 'Admin customer documents API');

  has(panel, [
    'AdminCustomerDocumentsPanel',
    '/api/admin/customer-center/documents',
    'Lookup & Edit Customer Quotations, Invoices and Warranties',
    'Customer ID / Account ID / Phone / Email / Name',
    'Update Document / 修改单据',
    'Warranty Years',
    'Warranty Terms',
    'Quotations / 报价',
    'Invoices / 发票',
    'Warranties / 保修单'
  ], 'Admin customer documents panel');
  noBrowserStorage(panel, 'Admin customer documents panel');

  has(customerCenterPage, ['AdminCustomerDocumentsPanel', '客户报价、发票和保修单'], 'Customer Center page');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-warranty-auto-generation-admin-documents', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
