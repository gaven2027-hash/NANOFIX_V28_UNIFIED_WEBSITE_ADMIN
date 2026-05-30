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
  'supabase/migrations/202605290015_document_company_settings.sql',
  'app/api/admin/service-operations/document-settings/route.ts',
  'app/api/admin/service-operations/invoice-pdfs/route.ts',
  'components/ServiceOperationsDocumentSettingsPanel.tsx',
  'app/service-operations/page.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing document settings PDF flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290015_document_company_settings.sql');
  const settingsApi = read('app/api/admin/service-operations/document-settings/route.ts');
  const invoiceApi = read('app/api/admin/service-operations/invoice-pdfs/route.ts');
  const panel = read('components/ServiceOperationsDocumentSettingsPanel.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'public.document_company_settings',
    'company_name text not null default',
    'company_tagline',
    'uen',
    'gst_registration_no',
    'payment_instructions',
    'warranty_footer',
    'terms_footer',
    'nanofix_default',
    'No-Hacking Leak Repair & Waterproofing Solutions',
    'document_company_settings_touch_updated_at',
    'enable row level security',
    'internal roles can read document company settings',
    'service role can write document company settings'
  ], 'Document company settings migration');

  has(settingsApi, [
    'document_company_settings',
    'save_document_company_settings',
    'service_operations_document_settings_read',
    'service_operations_document_settings_save',
    'company_name',
    'company_tagline',
    'uen',
    'gst_registration_no',
    'payment_instructions',
    'warranty_footer',
    'terms_footer',
    'writeAuditLog',
    'export async function GET',
    'export async function POST'
  ], 'Document company settings API');
  noSelectStar(settingsApi, 'Document company settings API');

  has(invoiceApi, [
    'loadDocumentSettings',
    'document_company_settings',
    'settingText',
    'company_name',
    'company_tagline',
    'payment_instructions',
    'warranty_footer',
    'terms_footer',
    'nanofix_polished_v1',
    'company_setting_id',
    'TAX INVOICE / INVOICE',
    'Payment Instructions:',
    'Warranty / Service Terms:',
    'Terms:'
  ], 'Invoice PDF polished template API');
  noSelectStar(invoiceApi, 'Invoice PDF polished template API');

  has(panel, [
    'ServiceOperationsDocumentSettingsPanel',
    '/api/admin/service-operations/document-settings',
    'save_document_company_settings',
    'Document Company Settings',
    'Invoice / Quotation PDF Template Settings',
    'Company Name / 公司名称',
    'Payment Instructions / 付款说明',
    'Warranty Footer / 保修页脚',
    'Terms Footer / 条款页脚',
    'Save Document Settings / 保存文档设置',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsDocumentSettingsPanel');
  noBrowserStorage(panel, 'ServiceOperationsDocumentSettingsPanel');

  has(servicePage, ['ServiceOperationsDocumentSettingsPanel'], 'Service Operations page');
  has(ready, ['document_company_settings'], '/api/ready document settings table check');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-document-settings-pdf-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
